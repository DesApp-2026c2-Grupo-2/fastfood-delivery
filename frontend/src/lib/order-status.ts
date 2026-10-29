const LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo para entregar',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const HINTS: Record<string, string> = {
  pending: 'Quedó registrado. Te avisamos cuando avance.',
  confirmed: 'La sucursal ya lo confirmó.',
  preparing: 'Lo están preparando.',
  ready: 'Ya está listo.',
  on_the_way: 'Va en camino.',
  delivered: 'Ya lo entregamos.',
  cancelled: 'El pedido se canceló.',
};

export function orderStatusLabel(status: string, fulfillment?: string | null): string {
  if (fulfillment === 'pickup') {
    if (status === 'ready') return 'Listo para retirar';
    if (status === 'delivered') return 'Retirado';
  }
  return LABELS[status] ?? status;
}

export function orderStatusHint(status: string, fulfillment?: string | null): string {
  if (fulfillment === 'pickup') {
    if (status === 'ready') return 'Ya podés pasar a retirarlo por la sucursal.';
    if (status === 'delivered') return 'Ya lo retiraste.';
  }
  return HINTS[status] ?? 'Te avisamos cuando avance.';
}
