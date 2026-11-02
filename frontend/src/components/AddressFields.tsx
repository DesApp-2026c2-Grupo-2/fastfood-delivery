import type { AddressParts } from '../lib/address';
import { PROVINCES } from '../lib/provinces';

type AddressFieldsProps = {
  value: AddressParts;
  onChange: (patch: Partial<AddressParts>) => void;
  disabled?: boolean;
};

/** Calle y número, ciudad, provincia y CP. Lo usan la cuenta y el invitado en el checkout. */
export function AddressFields({ value, onChange, disabled = false }: AddressFieldsProps) {
  return (
    <div className="address-fields">
      <label>
        Calle y número
        <input
          value={value.street}
          onChange={(event) => onChange({ street: event.target.value })}
          maxLength={200}
          placeholder="Av. Rivadavia 5000"
          autoComplete="address-line1"
          disabled={disabled}
        />
      </label>
      <div className="address-fields-row">
        <label>
          Ciudad
          <input
            value={value.city}
            onChange={(event) => onChange({ city: event.target.value })}
            maxLength={80}
            placeholder="Caballito"
            autoComplete="address-level2"
            disabled={disabled}
          />
        </label>
        <label>
          Provincia
          <select
            value={value.province}
            onChange={(event) => onChange({ province: event.target.value })}
            autoComplete="address-level1"
            disabled={disabled}
          >
            <option value="">Elegí…</option>
            {PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </label>
        <label className="address-fields-postal">
          CP
          <input
            value={value.postalCode}
            onChange={(event) => onChange({ postalCode: event.target.value.toUpperCase() })}
            maxLength={8}
            placeholder="1425"
            autoComplete="postal-code"
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  );
}
