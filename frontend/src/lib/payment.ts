export type PaymentMethod = 'cash' | 'card' | 'transfer';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'cash', label: 'Efectivo', hint: 'Pagás cuando recibís o retirás el pedido.' },
  { value: 'card', label: 'Tarjeta', hint: 'Pagás con tarjeta cuando recibís o retirás el pedido.' },
  { value: 'transfer', label: 'Transferencia bancaria', hint: 'Te mostramos los datos al confirmar.' },
];

export function paymentLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method;
}