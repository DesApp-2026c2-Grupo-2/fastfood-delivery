import type { OrderStatus } from '../api/types';

type TimedOrder = {
  status: OrderStatus;
  estimatedDeliveryAt?: string | null;
  delayMinutes?: number | null;
  scheduledFor?: string | null;
};

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function formatClock(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** Textos de hora estimada y demora para el admin (DEV-14 / DEV-15). */
export function orderTimingText(order: TimedOrder) {
  const clock = order.estimatedDeliveryAt ? formatClock(order.estimatedDeliveryAt) : null;
  const late = order.delayMinutes != null && order.delayMinutes > 0;
  const scheduled =
    order.scheduledFor && new Date(order.scheduledFor).getTime() > Date.now()
      ? `Programado para ${formatWhen(order.scheduledFor)}`
      : null;

  if (order.status === 'cancelled' || !clock) {
    return { eta: scheduled, delay: null as string | null };
  }

  if (order.status === 'delivered') {
    return {
      eta: `Hora estimada: ${clock}`,
      delay: late ? `Se demoró ${order.delayMinutes} min` : null,
    };
  }

  return {
    eta: scheduled ? `${scheduled}. Llega aprox. ${clock}` : `Llega aprox. ${clock}`,
    delay: late ? `Demorado ${order.delayMinutes} min` : null,
  };
}
