// Las 23 provincias y la Ciudad Autónoma de Buenos Aires, con el nombre que se guarda en Address.province.
export const PROVINCES = [
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Ciudad Autónoma de Buenos Aires',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
] as const;

export type Province = (typeof PROVINCES)[number];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^provincia de\s+/, '')
    .trim();
}

const BY_NORMALIZED = new Map(PROVINCES.map((province) => [normalize(province), province]));
const ALIASES = new Map<string, Province>([
  ['caba', 'Ciudad Autónoma de Buenos Aires'],
  ['capital federal', 'Ciudad Autónoma de Buenos Aires'],
  ['autonomous city of buenos aires', 'Ciudad Autónoma de Buenos Aires'],
]);

/**
 * Lleva el `state` de Nominatim a uno de los 24 nombres. Nominatim a veces trae el nombre largo
 * ("Tierra del Fuego, Antártida e Islas del Atlántico Sur") o con prefijo ("Provincia de …").
 * Si no lo reconoce, devuelve vacío para que el formulario no quede con un valor fuera de la lista.
 */
export function matchProvince(state: string): Province | '' {
  const key = normalize(state);
  if (!key) return '';
  const exact = BY_NORMALIZED.get(key) ?? ALIASES.get(key);
  if (exact) return exact;
  for (const [normalized, province] of BY_NORMALIZED) {
    if (key.startsWith(`${normalized},`)) return province;
  }
  return '';
}
