import { OrderStatus } from '@prisma/client';

const MS_PER_MINUTE = 60_000;

export type EtaSettings = {
  prepBaseMin: number;
  minPerItem: number;
  kmPerMin: number;
};

/**
 * Hora estimada de entrega: preparación base + minutos por ítem (cuenta cantidades) + traslado.
 * Se calcula una vez al confirmar y queda fija en Order.estimatedDeliveryAt. Las constantes salen
 * de la tabla Parameter (HU-19): cambiarlas no mueve la hora de los pedidos ya confirmados.
 */
export function estimateDeliveryAt(
  confirmedAt: Date,
  itemCount: number,
  distanceKm: number,
  settings: EtaSettings,
): Date {
  const travel = Math.ceil(distanceKm / settings.kmPerMin);
  const minutes = settings.prepBaseMin + itemCount * settings.minPerItem + travel;
  return new Date(confirmedAt.getTime() + minutes * MS_PER_MINUTE);
}

type TimedOrder = {
  status: OrderStatus;
  estimatedDeliveryAt: Date;
  // Solo hace falta el evento delivered; sin historial se toma como no entregado.
  statusHistory?: { status: OrderStatus; changedAt: Date }[];
};

/**
 * Campos de hora estimada y demora que devuelve el API (contrato §2.3 de la ficha del Sprint 3).
 * etaMinutes redondea para arriba (no promete antes de tiempo); delayMinutes para abajo
 * (no marca demora hasta que pasó un minuto entero).
 */
export function deliveryTiming(order: TimedOrder, now: Date = new Date()) {
  const estimatedMs = order.estimatedDeliveryAt.getTime();
  const base = { estimatedDeliveryAt: order.estimatedDeliveryAt };

  if (order.status === OrderStatus.cancelled) {
    return { ...base, etaMinutes: null, delayMinutes: null };
  }

  if (order.status === OrderStatus.delivered) {
    const delivered = order.statusHistory?.find((event) => event.status === OrderStatus.delivered);
    return {
      ...base,
      etaMinutes: null,
      delayMinutes: delivered
        ? Math.max(0, Math.floor((delivered.changedAt.getTime() - estimatedMs) / MS_PER_MINUTE))
        : null,
    };
  }

  const diff = estimatedMs - now.getTime();
  return {
    ...base,
    etaMinutes: Math.max(0, Math.ceil(diff / MS_PER_MINUTE)),
    delayMinutes: Math.max(0, Math.floor(-diff / MS_PER_MINUTE)),
  };
}
