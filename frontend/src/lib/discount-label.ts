const LOYALTY_REWARD_ID = 'loyalty-target-order';
const TOP3_REWARD_ID = 'loyalty-top-3-buyer';

/** El premio de campaña se muestra sin el porcentaje, también en pedidos viejos que lo tenían en el nombre. */
function rewardLabel(id?: string | null, name?: string | null): string | null {
  if (id === LOYALTY_REWARD_ID || (name ?? '').includes('Premio Fidelidad')) return 'Premio Fidelidad';
  if (id === TOP3_REWARD_ID || (name ?? '').includes('Top Comprador') || name === 'Premio Top 3') return 'Premio Top 3';
  return null;
}

/** Texto del descuento: "11% · promo 1" o "2x1 · Agua mineral". */
export function discountCaption(options: {
  id?: string | null;
  name?: string | null;
  type?: 'percent' | 'two_for_one' | null;
  value?: number | null;
}): string {
  const reward = rewardLabel(options.id, options.name);
  const name = reward ?? options.name ?? '';
  const kind = reward
    ? ''
    : options.type === 'two_for_one'
      ? '2x1'
      : options.type === 'percent' && options.value
        ? `${options.value}%`
        : '';
  if (kind && name) return `${kind} · ${name}`;
  return kind || name;
}
