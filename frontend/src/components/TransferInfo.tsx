import { formatPrice } from '../lib/money';

export function TransferInfo({ amount }: { amount?: number }) {
  return (
    <div className="payment-box" role="note">
      <p className="payment-box-title">Datos para transferir</p>
      <dl className="order-confirmed-facts">
        <div>
          <dt>Alias</dt>
          <dd>mordi.pedidos</dd>
        </div>
        <div>
          <dt>Titular</dt>
          <dd>Mordi</dd>
        </div>
        {amount !== undefined ? (
          <div>
            <dt>Importe</dt>
            <dd>{formatPrice(amount)}</dd>
          </div>
        ) : null}
      </dl>
      <p className="field-hint">Datos de ejemplo: es una simulación y no se registra ningún pago.</p>
    </div>
  );
}