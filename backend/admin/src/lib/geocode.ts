import { api } from '../api/client';
import { type AddressParts, normalizePostalCode } from './address';

export type GeocodeCandidate = {
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
};

type GeocodeResult = GeocodeCandidate & {
  candidates?: GeocodeCandidate[];
};

/**
 * POST /api/admin/branches/geocode: hasta 5 candidatos de Nominatim (Argentina). Con ciudad, provincia o CP
 * busca estructurado y, si no encuentra, en texto libre. Si no encuentra nada, responde 400.
 */
export async function searchBranchAddress(address: AddressParts, token: string): Promise<GeocodeCandidate[]> {
  const result = await api<GeocodeResult>('/admin/branches/geocode', {
    method: 'POST',
    token,
    body: JSON.stringify({
      street: address.street.trim(),
      ...(address.city.trim() ? { city: address.city.trim() } : {}),
      ...(address.province ? { province: address.province } : {}),
      ...(address.postalCode.trim() ? { postalCode: address.postalCode.trim() } : {}),
    }),
  });
  if (result.candidates?.length) return result.candidates;
  return [{ latitude: result.latitude, longitude: result.longitude, displayName: result.displayName }];
}

/** POST /api/geocode/reverse: la dirección que hay en ese punto. 400 si no hay ninguna. */
export function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeCandidate> {
  return api<GeocodeCandidate>('/geocode/reverse', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  });
}

/** Ciudad, provincia y CP de un candidato. Solo trae los que vinieron. */
export function candidateDetails(candidate: GeocodeCandidate): Partial<AddressParts> {
  const parts: Partial<AddressParts> = {};
  if (candidate.city?.trim()) parts.city = candidate.city.trim();
  if (candidate.province) parts.province = candidate.province;
  const postalCode = normalizePostalCode(candidate.postcode);
  if (postalCode) parts.postalCode = postalCode;
  return parts;
}

function plain(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Lo que se copia al formulario cuando el pin se marca a mano o con la ubicación: ciudad, provincia y CP
 * siguen al punto. La calle también, salvo que el punto no traiga número y la escrita sea la misma calle,
 * para no perder la altura que ya estaba cargada. Sin calle en el punto, la escrita queda como está.
 */
export function pinParts(current: AddressParts, found: GeocodeCandidate): Partial<AddressParts> {
  const parts = candidateDetails(found);
  const road = found.road?.trim() ?? '';
  const number = found.houseNumber?.trim() ?? '';
  if (!road) return parts;
  if (number) {
    parts.street = `${road} ${number}`;
    return parts;
  }
  const lastWord = plain(road).split(/\s+/).pop() ?? '';
  if (!lastWord || !plain(current.street).includes(lastWord)) parts.street = road;
  return parts;
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
