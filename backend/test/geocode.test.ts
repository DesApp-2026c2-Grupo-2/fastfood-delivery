import { matchProvince } from '../src/addresses/provinces';
import {
  GeocodeNotFoundError,
  GeocodeUnavailableError,
  buildNominatimReverseUrl,
  buildNominatimUrl,
  geocodeAddress,
  parseNominatimResults,
  reverseGeocode,
} from '../src/branches/geocode';

function located(candidate: {
  latitude: number;
  longitude: number;
  displayName: string;
  name?: string;
  road?: string;
  houseNumber?: string;
  postcode?: string;
  locality?: string;
  city?: string;
  province?: string;
}) {
  return {
    name: '',
    road: '',
    houseNumber: '',
    postcode: '',
    locality: '',
    city: '',
    province: '',
    ...candidate,
  };
}

function requestedUrl(fetchImpl: jest.Mock, call = 0): URL {
  return new URL((fetchImpl.mock.calls[call] as unknown as [string])[0]);
}

describe('Geocodificación de direcciones (Nominatim)', () => {
  it('arma la consulta limitada a Argentina', () => {
    const url = new URL(buildNominatimUrl('Av. Colón 100, Córdoba'));
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(url.searchParams.get('q')).toBe('Av. Colón 100, Córdoba');
    expect(url.searchParams.get('countrycodes')).toBe('ar');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('addressdetails')).toBe('1');
  });

  it('lee latitud, longitud y el nombre devuelto', () => {
    expect(
      parseNominatimResults([
        { lat: '-31.4135000', lon: '-64.1810500', display_name: 'Av. Colón, Córdoba' },
      ]),
    ).toEqual([
      located({
        latitude: -31.4135,
        longitude: -64.18105,
        displayName: 'Av. Colón, Córdoba',
      }),
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
    ).toEqual([located({ latitude: -31.42, longitude: -64.18, displayName: 'Bueno' })]);
  });

  it('guarda número, barrio y código postal para distinguir puntos de la misma calle', () => {
    expect(
      parseNominatimResults([
        {
          lat: '-34.60396',
          lon: '-58.384217',
          name: 'Avenida Corrientes',
          display_name: 'Avenida Corrientes, Balvanera, Buenos Aires, Argentina',
          address: {
            house_number: '1234',
            road: 'Avenida Corrientes',
            suburb: 'Balvanera',
            postcode: 'C1043',
          },
        },
      ]),
    ).toEqual([
      located({
        latitude: -34.60396,
        longitude: -58.384217,
        displayName: 'Avenida Corrientes, Balvanera, Buenos Aires, Argentina',
        name: 'Avenida Corrientes',
        road: 'Avenida Corrientes',
        houseNumber: '1234',
        postcode: 'C1043',
        locality: 'Balvanera',
      }),
    ]);
  });

  it('lee la ciudad y lleva la provincia a uno de los 24 nombres', () => {
    const [candidate] = parseNominatimResults([
      {
        lat: '-54.8019',
        lon: '-68.303',
        display_name: 'San Martín 100, Ushuaia, Tierra del Fuego, Argentina',
        address: {
          road: 'San Martín',
          house_number: '100',
          town: 'Ushuaia',
          state: 'Tierra del Fuego, Antártida e Islas del Atlántico Sur',
          postcode: 'V9410',
        },
      },
    ]);

    expect(candidate).toMatchObject({
      road: 'San Martín',
      houseNumber: '100',
      city: 'Ushuaia',
      province: 'Tierra del Fuego',
      postcode: 'V9410',
    });
  });

  it('reconoce las provincias con o sin tildes y deja vacía una que no existe', () => {
    expect(matchProvince('Provincia de Córdoba')).toBe('Córdoba');
    expect(matchProvince('cordoba')).toBe('Córdoba');
    expect(matchProvince('Ciudad Autónoma de Buenos Aires')).toBe('Ciudad Autónoma de Buenos Aires');
    expect(matchProvince('Buenos Aires')).toBe('Buenos Aires');
    expect(matchProvince('Montevideo')).toBe('');
    expect(matchProvince('')).toBe('');
  });

  it('arma la consulta estructurada sin la búsqueda libre (HU-34)', () => {
    const url = new URL(
      buildNominatimUrl({
        street: ' Av. Colón 100 ',
        city: 'Córdoba',
        province: 'Córdoba',
        postalCode: '5000',
      }),
    );

    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(url.searchParams.get('q')).toBeNull();
    expect(url.searchParams.get('street')).toBe('Av. Colón 100');
    expect(url.searchParams.get('city')).toBe('Córdoba');
    expect(url.searchParams.get('state')).toBe('Córdoba');
    expect(url.searchParams.get('postalcode')).toBe('5000');
    expect(url.searchParams.get('country')).toBe('Argentina');
    expect(url.searchParams.get('countrycodes')).toBe('ar');
    expect(url.searchParams.get('addressdetails')).toBe('1');
  });

  it('en la consulta estructurada omite los campos vacíos', () => {
    const url = new URL(buildNominatimUrl({ street: 'Av. Colón 100', city: 'Córdoba', province: '', postalCode: null }));

    expect(url.searchParams.get('city')).toBe('Córdoba');
    expect(url.searchParams.has('state')).toBe(false);
    expect(url.searchParams.has('postalcode')).toBe(false);
  });

  it('busca estructurado y, si encuentra, no repite la búsqueda', async () => {
    const fetchImpl = jest.fn(async () =>
      Response.json([{ lat: '-31.4135', lon: '-64.18105', display_name: 'Av. Colón 100, Córdoba' }]),
    );

    await expect(
      geocodeAddress({ street: 'Av. Colón 100', city: 'Córdoba', province: 'Córdoba', postalCode: '5000' }, fetchImpl),
    ).resolves.toHaveLength(1);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(requestedUrl(fetchImpl).searchParams.get('street')).toBe('Av. Colón 100');
    expect(requestedUrl(fetchImpl).searchParams.get('q')).toBeNull();
  });

  it('si la estructurada no encuentra nada, prueba la búsqueda libre con los mismos datos', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(
        Response.json([{ lat: '-31.4135', lon: '-64.18105', display_name: 'Av. Colón 100, Córdoba' }]),
      );

    await expect(
      geocodeAddress({ street: 'Av. Colón 100', city: 'Córdoba', province: 'Córdoba', postalCode: '5000' }, fetchImpl),
    ).resolves.toEqual([
      located({ latitude: -31.4135, longitude: -64.18105, displayName: 'Av. Colón 100, Córdoba' }),
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(requestedUrl(fetchImpl, 1).searchParams.get('q')).toBe('Av. Colón 100, Córdoba, Córdoba, 5000');
    expect(requestedUrl(fetchImpl, 1).searchParams.has('street')).toBe(false);
  });

  it('solo con la calle va directo a la búsqueda libre', async () => {
    const fetchImpl = jest.fn(async () =>
      Response.json([{ lat: '-31.4135', lon: '-64.18105', display_name: 'Av. Colón 100, Córdoba' }]),
    );

    await geocodeAddress({ street: 'Av. Colón 100, Córdoba' }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(requestedUrl(fetchImpl).searchParams.get('q')).toBe('Av. Colón 100, Córdoba');
  });

  it('avisa si ninguna de las dos búsquedas encuentra la dirección', async () => {
    const fetchImpl = jest.fn(async () => Response.json([]));

    await expect(
      geocodeAddress({ street: 'Calle Falsa 123', city: 'Springfield', province: 'Córdoba' }, fetchImpl),
    ).rejects.toBeInstanceOf(GeocodeNotFoundError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('arma la consulta inversa con las coordenadas', () => {
    const url = new URL(buildNominatimReverseUrl(-34.60396, -58.384217));

    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/reverse');
    expect(url.searchParams.get('lat')).toBe('-34.60396');
    expect(url.searchParams.get('lon')).toBe('-58.384217');
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(url.searchParams.get('addressdetails')).toBe('1');
  });

  it('el inverso devuelve calle, número, ciudad, provincia y CP del punto', async () => {
    const fetchImpl = jest.fn(async () =>
      Response.json({
        lat: '-34.6037',
        lon: '-58.3816',
        name: 'Kiosco Obelisco',
        display_name: 'Kiosco Obelisco, 1000, Avenida Corrientes, San Nicolás, Buenos Aires, Argentina',
        address: {
          shop: 'Kiosco Obelisco',
          house_number: '1000',
          road: 'Avenida Corrientes',
          suburb: 'San Nicolás',
          city: 'Buenos Aires',
          state: 'Ciudad Autónoma de Buenos Aires',
          postcode: 'C1043',
        },
      }),
    );

    await expect(reverseGeocode(-34.6037, -58.3816, fetchImpl)).resolves.toMatchObject({
      name: 'Kiosco Obelisco',
      road: 'Avenida Corrientes',
      houseNumber: '1000',
      city: 'Buenos Aires',
      province: 'Ciudad Autónoma de Buenos Aires',
      postcode: 'C1043',
    });
    expect(requestedUrl(fetchImpl).pathname).toBe('/reverse');
  });

  it('el inverso avisa si no hay una dirección en ese punto', async () => {
    const fetchImpl = jest.fn(async () => Response.json({ error: 'Unable to geocode' }));

    await expect(reverseGeocode(-60, -40, fetchImpl)).rejects.toBeInstanceOf(GeocodeNotFoundError);
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
      located({ latitude: -31.4201, longitude: -64.1888, displayName: 'Centro, Córdoba' }),
      located({ latitude: -31.4101, longitude: -64.1788, displayName: 'Centro, Villa Allende' }),
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
