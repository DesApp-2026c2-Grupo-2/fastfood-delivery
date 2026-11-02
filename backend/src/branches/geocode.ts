import { matchProvince } from '../addresses/provinces';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const MIN_INTERVAL_MS = 1_100;
const REQUEST_TIMEOUT_MS = 8_000;
// DEV-20: con un solo resultado, direcciones ambiguas o mal escritas quedaban sin salida.
export const MAX_CANDIDATES = 5;

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  name: string;
  // La calle sola. `name` puede ser un comercio o un edificio cuando el punto cae sobre uno.
  road: string;
  houseNumber: string;
  postcode: string;
  locality: string;
  city: string;
  province: string;
};

/** Dirección separada en campos, como la carga el formulario. */
export type StructuredAddress = {
  street: string;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
};

export type GeocodeQuery = string | StructuredAddress;

export class GeocodeNotFoundError extends Error {
  constructor(message = 'No encontramos esa dirección. Probá con calle, número y ciudad.') {
    super(message);
    this.name = 'GeocodeNotFoundError';
  }
}

export class GeocodeUnavailableError extends Error {
  constructor() {
    super('No se pudo consultar la dirección. Intentá de nuevo en un momento.');
    this.name = 'GeocodeUnavailableError';
  }
}

let pending: Promise<unknown> = Promise.resolve();
let lastStart = 0;

function roundCoordinate(value: number): number {
  return Math.round(value * 1e7) / 1e7;
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hasDetails(address: StructuredAddress): boolean {
  return Boolean(clean(address.city) || clean(address.province) || clean(address.postalCode));
}

/** La misma dirección en una sola línea, para la búsqueda libre. */
export function freeTextAddress(address: StructuredAddress): string {
  return [address.street, address.city, address.province, address.postalCode]
    .map(clean)
    .filter(Boolean)
    .join(', ');
}

/**
 * Un texto va como búsqueda libre (`q`). Una dirección separada va como búsqueda estructurada:
 * Nominatim no acepta mezclar `q` con `street`, `city`, `state` o `postalcode`.
 */
export function buildNominatimUrl(query: GeocodeQuery): string {
  const url = new URL(NOMINATIM_URL);
  if (typeof query === 'string') {
    url.searchParams.set('q', query);
  } else {
    url.searchParams.set('street', clean(query.street));
    if (clean(query.city)) url.searchParams.set('city', clean(query.city));
    if (clean(query.province)) url.searchParams.set('state', clean(query.province));
    if (clean(query.postalCode)) url.searchParams.set('postalcode', clean(query.postalCode));
    url.searchParams.set('country', 'Argentina');
  }
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', String(MAX_CANDIDATES));
  url.searchParams.set('countrycodes', 'ar');
  url.searchParams.set('addressdetails', '1');
  return url.toString();
}

export function buildNominatimReverseUrl(latitude: number, longitude: number): string {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  // 18 = nivel de edificio: trae calle y número cuando OpenStreetMap los tiene.
  url.searchParams.set('zoom', '18');
  return url.toString();
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCandidate(entry: unknown): GeocodeResult | null {
  if (!entry || typeof entry !== 'object') return null;

  const record = entry as {
    lat?: unknown;
    lon?: unknown;
    display_name?: unknown;
    name?: unknown;
    address?: unknown;
  };
  const latitude = roundCoordinate(Number(record.lat));
  const longitude = roundCoordinate(Number(record.lon));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;

  const address =
    record.address && typeof record.address === 'object'
      ? (record.address as Record<string, unknown>)
      : {};
  const road = text(address.road) || text(address.pedestrian);

  return {
    latitude,
    longitude,
    displayName: text(record.display_name),
    name: text(record.name) || road,
    road,
    houseNumber: text(address.house_number),
    postcode: text(address.postcode),
    locality:
      text(address.neighbourhood) ||
      text(address.suburb) ||
      text(address.quarter) ||
      text(address.city_district),
    city:
      text(address.city) ||
      text(address.town) ||
      text(address.village) ||
      text(address.municipality),
    province: matchProvince(text(address.state)),
  };
}

/** Hasta MAX_CANDIDATES resultados válidos, en el orden de relevancia de Nominatim. Vacío si no hay ninguno. */
export function parseNominatimResults(body: unknown): GeocodeResult[] {
  if (!Array.isArray(body)) return [];
  return body
    .map(parseCandidate)
    .filter((candidate): candidate is GeocodeResult => candidate !== null)
    .slice(0, MAX_CANDIDATES);
}

/** El inverso devuelve un solo objeto, o `{ error }` si no hay nada en ese punto. */
export function parseNominatimReverse(body: unknown): GeocodeResult | null {
  if (!body || typeof body !== 'object' || 'error' in body) return null;
  return parseCandidate(body);
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = pending.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastStart);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastStart = Date.now();
    return task();
  });
  pending = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function requestNominatim(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  return enqueue(async () => {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'es',
          'User-Agent': 'MordiAdmin/1.0 (educational project)',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new GeocodeUnavailableError();
    }

    if (!response.ok) {
      throw new GeocodeUnavailableError();
    }

    return response.json().catch(() => null);
  });
}

async function search(query: GeocodeQuery, fetchImpl: typeof fetch): Promise<GeocodeResult[]> {
  return parseNominatimResults(await requestNominatim(buildNominatimUrl(query), fetchImpl));
}

/**
 * Con ciudad, provincia o CP prueba primero la búsqueda estructurada, que es más precisa. Si no
 * encuentra nada, repite como búsqueda libre con los mismos datos en una línea.
 */
export async function geocodeAddress(
  query: GeocodeQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodeResult[]> {
  const structured = typeof query === 'string' ? null : { ...query, street: clean(query.street) };
  const freeText = typeof query === 'string' ? query.trim() : freeTextAddress(query);
  if (!freeText || (structured && !structured.street)) {
    throw new GeocodeNotFoundError();
  }

  if (structured && hasDetails(structured)) {
    const candidates = await search(structured, fetchImpl);
    if (candidates.length > 0) return candidates;
  }

  const candidates = await search(freeText, fetchImpl);
  if (candidates.length === 0) {
    throw new GeocodeNotFoundError();
  }
  return candidates;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodeResult> {
  const result = parseNominatimReverse(
    await requestNominatim(buildNominatimReverseUrl(latitude, longitude), fetchImpl),
  );
  if (!result) {
    throw new GeocodeNotFoundError('No encontramos una dirección en ese punto. Escribila a mano.');
  }
  return result;
}
