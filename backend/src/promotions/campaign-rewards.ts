export const LOYALTY_REWARD_ID = 'loyalty-target-order';
export const TOP3_REWARD_ID = 'loyalty-top-3-buyer';

/** Nombre que ve el cliente. El porcentaje queda en el cálculo, no en el texto. */
export const LOYALTY_REWARD_NAME = 'Premio Fidelidad';
export const TOP3_REWARD_NAME = 'Premio Top 3';

/**
 * Contador de la tarjeta. Si este pedido cerró el ciclo y el cliente sigue justo en un múltiplo,
 * se muestra la grilla llena. Si ya sumó sellos después, se muestra el resto.
 */
export function loyaltyCardProgress(stamps: number, ordersRequired: number, cycleCompleted: boolean): number {
  if (ordersRequired <= 0) return 0;
  const remainder = stamps % ordersRequired;
  if (cycleCompleted && remainder === 0 && stamps > 0) return ordersRequired;
  return remainder;
}
