import {
  GeocodeNotFoundError,
  GeocodeUnavailableError,
  buildNominatimUrl,
  geocodeAddress,
  parseNominatimResults,
} from '../src/branches/geocode';

describe('Geocodificación de direcciones (Nominatim)', () => {
  it('arma la consulta limitada a Argentina', () => {
    const url = new URL(buildNominatimUrl('Av. Colón 100, Córdoba'));
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(url.searchParams.get('q')).toBe('Av. Colón 100, Córdoba');
    expect(url.searchParams.get('countrycodes')).toBe('ar');
    expect(url.searchParams.get('limit')).toBe('1');
  });

  it('lee latitud, longitud y el nombre devuelto', () => {
    expect(
      parseNominatimResults([
        { lat: '-31.4135000', lon: '-64.1810500', display_name: 'Av. Colón, Córdoba' },
      ]),
    ).toEqual({
      latitude: -31.4135,
      longitude: -64.18105,
      displayName: 'Av. Colón, Córdoba',
    });
  });

  it('descarta una respuesta vacía o con coordenadas inválidas', () => {
    expect(parseNominatimResults([])).toBeNull();
    expect(parseNominatimResults([{ lat: 'norte', lon: '-64.18' }])).toBeNull();
    expect(parseNominatimResults(null)).toBeNull();
  });

  it('devuelve las coordenadas cuando Nominatim responde', async () => {
    const fetchImpl = jest.fn(async () =>
      Response.json([{ lat: '-31.4201', lon: '-64.1888', display_name: 'Centro, Córdoba' }]),
    );

    await expect(geocodeAddress('  Centro, Córdoba  ', fetchImpl)).resolves.toEqual({
      latitude: -31.4201,
      longitude: -64.1888,
      displayName: 'Centro, Córdoba',
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).searchParams.get('q')).toBe('Centro, Córdoba');
    expect(init.headers).toMatchObject({
      'User-Agent': 'MordiAdmin/1.0 (educational project)',
    });
  });

  it('avisa si la dirección no existe', async () => {
    const fetchImpl = jest.fn(async () => Response.json([]));
    await expect(geocodeAddress('calle que no existe 99999', fetchImpl)).rejects.toBeInstanceOf(
      GeocodeNotFoundError,
    );
  });

  it('avisa si el servicio no responde', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('network');
    });
    await expect(geocodeAddress('Av. Colón 100, Córdoba', fetchImpl)).rejects.toBeInstanceOf(
      GeocodeUnavailableError,
    );
  });
});
