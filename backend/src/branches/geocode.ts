const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL_MS = 1_100;
const REQUEST_TIMEOUT_MS = 8_000;
// DEV-20: con un solo resultado, direcciones ambiguas o mal escritas quedaban sin salida.
export const MAX_CANDIDATES = 5;

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  name: string;
  houseNumber: string;
  postcode: string;
  locality: string;
};

export class GeocodeNotFoundError extends Error {
  constructor() {
    super('No encontramos esa dirección. Probá con calle, número y ciudad.');
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

export function buildNominatimUrl(address: string): string {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', String(MAX_CANDIDATES));
  url.searchParams.set('countrycodes', 'ar');
  url.searchParams.set('addressdetails', '1');
  return url.toString();
}

function parseCandidate(entry: unknown): GeocodeResult | null {
  if (!entry || typeof entry !== 'object') return null;

  const record = entry as { lat?: unknown; lon?: unknown; display_name?: unknown };
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
    houseNumber: text(address.house_number),
    postcode: text(address.postcode),
    locality:
      text(address.neighbourhood) ||
      text(address.suburb) ||
      text(address.quarter) ||
      text(address.city_district),
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

export function geocodeAddress(
  address: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodeResult[]> {
  const query = address.trim();
  if (!query) {
    return Promise.reject(new GeocodeNotFoundError());
  }

  return enqueue(async () => {
    let response: Response;
    try {
      response = await fetchImpl(buildNominatimUrl(query), {
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

    const body: unknown = await response.json().catch(() => null);
    const candidates = parseNominatimResults(body);
    if (candidates.length === 0) {
      throw new GeocodeNotFoundError();
    }
    return candidates;
  });
}
