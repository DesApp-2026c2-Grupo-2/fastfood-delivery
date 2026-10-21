/** Texto del descuento: "11% · promo 1" o "2x1 · Agua mineral". */
export function discountCaption(options: {
  name?: string | null;
  type?: 'percent' | 'two_for_one' | null;
  value?: number | null;
}): string {
  const kind =
    options.type === 'two_for_one'
      ? '2x1'
      : options.type === 'percent' && options.value
        ? `${options.value}%`
        : '';
  if (kind && options.name) return `${kind} · ${options.name}`;
  return kind || options.name || '';
}
