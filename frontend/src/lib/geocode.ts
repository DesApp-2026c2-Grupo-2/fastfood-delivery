import { api } from '../api/client';

export type GeocodeCandidate = {
  latitude: number;
  longitude: number;
  displayName: string;
  name?: string;
  houseNumber?: string;
  postcode?: string;
  locality?: string;
};

export type GeocodeResult = GeocodeCandidate & {
  candidates?: GeocodeCandidate[];
};

/** POST /api/geocode: hasta 5 candidatos de Nominatim (Argentina). Si no encuentra nada, el API responde 400. */
export async function searchAddress(street: string): Promise<GeocodeCandidate[]> {
  const result = await api<GeocodeResult>('/geocode', {
    method: 'POST',
    body: JSON.stringify({ address: street }),
  });
  if (result.candidates?.length) return result.candidates;
  return [{ latitude: result.latitude, longitude: result.longitude, displayName: result.displayName }];
}

/** Título corto y detalle de un candidato, para listarlo como opción. */
export function addressLines(candidate: GeocodeCandidate) {
  const parts = candidate.displayName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const head = parts.slice(0, 2);
  const title =
    candidate.houseNumber && !head.includes(candidate.houseNumber)
      ? [candidate.houseNumber, ...head].join(', ')
      : head.join(', ') || candidate.displayName;
  const place = parts.slice(2, 5).join(' · ');
  const postcode =
    candidate.postcode && !`${title} ${place}`.includes(candidate.postcode) ? candidate.postcode : '';
  return {
    title,
    detail: [place, postcode].filter(Boolean).join(' · '),
  };
}
