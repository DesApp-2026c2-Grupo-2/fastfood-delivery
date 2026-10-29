import { PAYMENT_METHODS, type PaymentMethod } from '../lib/payment';

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  return (
    <fieldset className="tag-fieldset">
      <legend>Método de pago</legend>
      {PAYMENT_METHODS.map((method) => (
        <label key={method.value} className="checkbox address-choice">
          <input
            type="radio"
            name="paymentMethod"
            checked={value === method.value}
            onChange={() => onChange(method.value)}
          />
          <span>
            {method.label}
            <small className="muted"> · {method.hint}</small>
          </span>
        </label>
      ))}
      <p className="field-hint">Es una simulación: no se cobra ni se guarda nada.</p>
    </fieldset>
  );
}