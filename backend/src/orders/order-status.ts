import { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo para entregar',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: [OrderStatus.confirmed, OrderStatus.cancelled],
  confirmed: [OrderStatus.preparing, OrderStatus.cancelled],
  preparing: [OrderStatus.ready],
  ready: [OrderStatus.on_the_way],
  on_the_way: [OrderStatus.delivered],
  delivered: [],
  cancelled: [],
};

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return NEXT[status] ?? [];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT[from]?.includes(to) ?? false;
}

const DESCRIPTION: Record<OrderStatus, string> = {
  pending: 'El cliente confirmó el pedido y el stock quedó reservado. Espera que el local lo acepte.',
  confirmed: 'El local aceptó el pedido. Todavía se puede cancelar.',
  preparing: 'El pedido se está preparando. Ya no se puede cancelar.',
  ready: 'El pedido está listo y espera al repartidor.',
  on_the_way: 'El repartidor está llevando el pedido.',
  delivered: 'El pedido llegó. La reserva de stock se descuenta.',
  cancelled: 'El pedido se canceló. La reserva de stock vuelve a estar disponible.',
};

/** Estados del sistema para consulta en el admin (RF-ADM-08), en el orden del ciclo de vida. */
export function orderStatusCatalog() {
  return Object.values(OrderStatus).map((status) => ({
    status,
    label: ORDER_STATUS_LABEL[status],
    description: DESCRIPTION[status],
    next: nextStatuses(status),
    cancellable: canTransition(status, OrderStatus.cancelled),
    final: nextStatuses(status).length === 0,
  }));
}
