export type PaymentMethod = 'cash' | 'card' | 'transfer';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'cash', label: 'Efectivo', hint: 'Pagás cuando recibís o retirás el pedido.' },
  { value: 'card', label: 'Tarjeta', hint: 'Pagás con tarjeta cuando recibís o retirás el pedido.' },
  { value: 'transfer', label: 'Transferencia bancaria', hint: 'Te mostramos los datos al confirmar.' },
];

export function paymentLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method;
}

export type CardData = {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
};

export const emptyCard: CardData = { holder: '', number: '', expiry: '', cvv: '' };

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

// Devuelve el mensaje de error, o '' si los datos de la simulación son válidos.
export function validateCard(card: CardData): string {
  if (card.holder.trim().length < 2) return 'Completá el nombre que figura en la tarjeta.';
  if (card.number.replace(/\D/g, '').length < 13) return 'El número de tarjeta está incompleto.';
  const match = /^(\d{2})\/(\d{2})$/.exec(card.expiry);
  if (!match) return 'Ingresá el vencimiento como MM/AA.';
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return 'El mes del vencimiento no es válido.';
  if (new Date(year, month, 1) <= new Date()) return 'La tarjeta está vencida.';
  if (!/^\d{3,4}$/.test(card.cvv)) return 'El código de seguridad debe tener 3 o 4 dígitos.';
  return '';
}