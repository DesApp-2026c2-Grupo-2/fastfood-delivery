/** Los campos de texto de una dirección, como los carga el formulario. */
export type AddressParts = {
  street: string;
  city: string;
  province: string;
  postalCode: string;
};

type AddressLike = {
  street: string;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
};

/** "Av. Rivadavia 5000, Caballito, Ciudad Autónoma de Buenos Aires (C1406)". Omite lo que falte. */
export function formatAddress(address: AddressLike): string {
  const place = [address.street, address.city, address.province]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  const postalCode = address.postalCode?.trim();
  return postalCode ? `${place} (${postalCode})` : place;
}

type BranchAddressLike = Omit<AddressLike, 'street'> & { address: string };

/** La sucursal guarda la calle en `address`; las sucursales viejas no tienen ciudad, provincia ni CP. */
export function formatBranchAddress(branch: BranchAddressLike): string {
  return formatAddress({ ...branch, street: branch.address });
}

/**
 * El API acepta 4 dígitos o el CPA completo (C1425ABC). Nominatim suele traer la letra de la provincia
 * con los 4 dígitos ("C1043"); de eso se queda con los dígitos.
 */
export function normalizePostalCode(raw: string | null | undefined): string {
  const value = (raw ?? '').replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z]\d{4}[A-Z]{3}$/.test(value)) return value;
  return value.match(/\d{4}/)?.[0] ?? '';
}

/** Qué falta para poder guardar. Vacío si está completa. */
export function addressPartsError(parts: AddressParts): string {
  if (!parts.street.trim()) return 'Completá la calle y el número.';
  if (!parts.city.trim()) return 'Completá la ciudad.';
  if (!parts.province) return 'Elegí la provincia.';
  if (!parts.postalCode.trim()) return 'Completá el código postal.';
  if (!/^([A-Z]\d{4}[A-Z]{3}|\d{4})$/.test(parts.postalCode.replace(/\s+/g, '').toUpperCase())) {
    return 'El código postal tiene 4 números (1425) o es un CPA (C1425ABC).';
  }
  return '';
}
