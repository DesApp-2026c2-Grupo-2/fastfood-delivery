import type { OrderStatus } from '../api/types';

type TimedOrder = {
  status: OrderStatus;
  estimatedDeliveryAt?: string | null;
  delayMinutes?: number | null;
};

function formatClock(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** Textos de hora estimada y demora para el admin (DEV-14 / DEV-15). */
export function orderTimingText(order: TimedOrder) {
  const clock = order.estimatedDeliveryAt ? formatClock(order.estimatedDeliveryAt) : null;
  const late = order.delayMinutes != null && order.delayMinutes > 0;

  if (order.status === 'cancelled' || !clock) {
    return { eta: null as string | null, delay: null as string | null };
  }

  if (order.status === 'delivered') {
    return {
      eta: `Hora estimada: ${clock}`,
      delay: late ? `Se demoró ${order.delayMinutes} min` : null,
    };
  }

  return {
    eta: `Llega aprox. ${clock}`,
    delay: late ? `Demorado ${order.delayMinutes} min` : null,
  };
}
