export const MAX_AVAILABLE = 1_000_000;

// Cada acción masiva sabe calcular el disponible nuevo. La pantalla solo elige una y la aplica.
export type StockAdjustment = {
  id: string;
  label: string;
  danger?: boolean;
  needsQuantity: boolean;
  confirm?: (count: number) => string;
  apply: (current: number, quantity: number) => number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(MAX_AVAILABLE, value));
}

export const stockAdjustments: StockAdjustment[] = [
  {
    id: 'add',
    label: 'Sumar',
    needsQuantity: true,
    apply: (current, quantity) => clamp(current + quantity),
  },
  {
    id: 'sub',
    label: 'Quitar',
    needsQuantity: true,
    apply: (current, quantity) => clamp(current - quantity),
  },
  {
    id: 'zero',
    label: 'Poner en 0',
    danger: true,
    needsQuantity: false,
    confirm: (count) => `¿Dejar en 0 el disponible de ${count} producto${count === 1 ? '' : 's'}?`,
    apply: () => 0,
  },
];

export function parseAvailable(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0 || value > MAX_AVAILABLE) return null;
  return value;
}
