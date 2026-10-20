import {
  GeocodeNotFoundError,
  GeocodeUnavailableError,
  buildNominatimUrl,
  geocodeAddress,
  parseNominatimResults,
} from '../src/branches/geocode';

function located(candidate: {
  latitude: number;
  longitude: number;
  displayName: string;
  name?: string;
  houseNumber?: string;
  postcode?: string;
  locality?: string;
}) {
  return {
    name: '',
    houseNumber: '',
    postcode: '',
    locality: '',
    ...candidate,
  };
}

describe('Geocodificación de direcciones (Nominatim)', () => {
  it('arma la consulta limitada a Argentina', () => {
    const url = new URL(buildNominatimUrl('Av. Colón 100, Córdoba'));
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(url.searchParams.get('q')).toBe('Av. Colón 100, Córdoba');
    expect(url.searchParams.get('countrycodes')).toBe('ar');
    expect(url.searchParams.get('limit')).toBe('5');
  });

  it('lee latitud, longitud y el nombre devuelto', () => {
    expect(
      parseNominatimResults([
        { lat: '-31.4135000', lon: '-64.1810500', display_name: 'Av. Colón, Córdoba' },
      ]),
    ).toEqual([
      {
        latitude: -31.4135,
        longitude: -64.18105,
        displayName: 'Av. Colón, Córdoba',
      },
    ]);
  });

  it('conserva el orden de los candidatos y no pasa de cinco', () => {
    const body = Array.from({ length: 7 }, (_, index) => ({
      lat: String(-31 - index / 100),
      lon: '-64.18',
      display_name: `Candidato ${index}`,
    }));

    const candidates = parseNominatimResults(body);

    expect(candidates.map((candidate) => candidate.displayName)).toEqual([
      'Candidato 0',
      'Candidato 1',
      'Candidato 2',
      'Candidato 3',
      'Candidato 4',
    ]);
  });

  it('descarta los candidatos con coordenadas inválidas y deja los buenos', () => {
    expect(
      parseNominatimResults([
        { lat: 'norte', lon: '-64.18', display_name: 'Roto' },
        { lat: '-31.42', lon: '-64.18', display_name: 'Bueno' },
      ]),
    ).toEqual([{ latitude: -31.42, longitude: -64.18, displayName: 'Bueno' }]);
  });

  it('descarta una respuesta vacía o con coordenadas inválidas', () => {
    expect(parseNominatimResults([])).toEqual([]);
    expect(parseNominatimResults([{ lat: 'norte', lon: '-64.18' }])).toEqual([]);
    expect(parseNominatimResults(null)).toEqual([]);
  });

  it('devuelve los candidatos cuando Nominatim responde', async () => {
    const fetchImpl = jest.fn(async () =>
      Response.json([
        { lat: '-31.4201', lon: '-64.1888', display_name: 'Centro, Córdoba' },
        { lat: '-31.4101', lon: '-64.1788', display_name: 'Centro, Villa Allende' },
      ]),
    );

    await expect(geocodeAddress('  Centro, Córdoba  ', fetchImpl)).resolves.toEqual([
      { latitude: -31.4201, longitude: -64.1888, displayName: 'Centro, Córdoba' },
      { latitude: -31.4101, longitude: -64.1788, displayName: 'Centro, Villa Allende' },
    ]);

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
