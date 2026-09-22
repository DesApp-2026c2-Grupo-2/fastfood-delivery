import { type FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Address } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { formatCoordinate, requestDevicePosition } from '../../lib/geolocation';

type FormState = {
  id?: string;
  street: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
};

const emptyForm: FormState = {
  street: '',
  latitude: '',
  longitude: '',
  isDefault: false,
};

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

export function AddressesPage() {
  const token = getToken();

  if (!isCustomer() || !token) {
    return <Navigate to="/login" replace state={{ from: '/account/addresses' }} />;
  }

  return <AddressesContent token={token} />;
}

function AddressesContent({ token }: { token: string }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setAddresses(await api<Address[]>('/me/addresses', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las direcciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fillFromDevice() {
    setLocating(true);
    setLocationHint('');
    setError('');
    try {
      const position = await requestDevicePosition();
      setForm((current) =>
        current
          ? {
              ...current,
              latitude: formatCoordinate(position.latitude),
              longitude: formatCoordinate(position.longitude),
            }
          : current,
      );
      setLocationHint('Ubicación del dispositivo cargada. Podés ajustarla si hace falta.');
    } catch (err) {
      setLocationHint(err instanceof Error ? err.message : 'No pudimos obtener tu ubicación; cargala a mano.');
    } finally {
      setLocating(false);
    }
  }

  function startCreate() {
    setForm(emptyForm);
    setError('');
    setOk('');
    setLocationHint('');
    void fillFromDevice();
  }

  function startEdit(address: Address) {
    setForm({
      id: address.id,
      street: address.street,
      latitude: String(toNumber(address.latitude)),
      longitude: String(toNumber(address.longitude)),
      isDefault: address.isDefault,
    });
    setError('');
    setOk('');
    setLocationHint('');
  }

  function cancelForm() {
    setForm(null);
    setError('');
    setLocationHint('');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!form.street.trim()) {
      setError('Completá la dirección.');
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setError('Latitud inválida (-90 a 90).');
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError('Longitud inválida (-180 a 180).');
      return;
    }

    const payload = {
      street: form.street.trim(),
      latitude,
      longitude,
      isDefault: form.isDefault,
    };

    setSaving(true);
    setError('');
    setOk('');
    try {
      if (form.id) {
        await api(`/me/addresses/${form.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload),
        });
        setOk('Dirección actualizada.');
      } else {
        await api('/me/addresses', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
        setOk('Dirección guardada.');
      }
      setForm(null);
      setLocationHint('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(address: Address) {
    if (!confirm(`¿Borrar la dirección “${address.street}”?`)) return;
    setError('');
    setOk('');
    try {
      await api(`/me/addresses/${address.id}`, { method: 'DELETE', token });
      setOk('Dirección eliminada.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    }
  }

  async function makeDefault(address: Address) {
    setError('');
    setOk('');
    try {
      await api(`/me/addresses/${address.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isDefault: true }),
      });
      setOk('Dirección marcada como predeterminada.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  }

  return (
    <section className="stack addresses-page">
      <header className="page-head">
        <div>
          <h1>Mis direcciones</h1>
          <p className="muted">Guardá dónde querés recibir tus pedidos. Podés usar la ubicación del dispositivo o cargarla a mano.</p>
        </div>
        {!form ? (
          <button type="button" onClick={startCreate}>
            Nueva dirección
          </button>
        ) : null}
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="success" role="status">
          {ok}
        </p>
      ) : null}

      {form ? (
        <form className="card form address-form" onSubmit={onSubmit}>
          <h2>{form.id ? 'Editar dirección' : 'Nueva dirección'}</h2>

          <label>
            Calle y número
            <input
              value={form.street}
              onChange={(event) => setForm((current) => current && { ...current, street: event.target.value })}
              required
              maxLength={200}
              placeholder="Av. Rivadavia 5000, CABA"
            />
          </label>

          <fieldset className="address-location">
            <legend>Ubicación</legend>
            <p className="field-hint">
              Usamos latitud y longitud para asignar la sucursal más cercana. Sin mapa en este sprint.
            </p>
            <div className="row">
              <label>
                Latitud
                <input
                  value={form.latitude}
                  onChange={(event) => setForm((current) => current && { ...current, latitude: event.target.value })}
                  required
                  inputMode="decimal"
                  placeholder="-34.6037"
                />
              </label>
              <label>
                Longitud
                <input
                  value={form.longitude}
                  onChange={(event) => setForm((current) => current && { ...current, longitude: event.target.value })}
                  required
                  inputMode="decimal"
                  placeholder="-58.3816"
                />
              </label>
            </div>
            <div className="address-location-actions">
              <button type="button" className="secondary" onClick={() => void fillFromDevice()} disabled={locating}>
                {locating ? 'Obteniendo…' : 'Usar mi ubicación'}
              </button>
              {locationHint ? <p className="muted address-location-hint">{locationHint}</p> : null}
            </div>
          </fieldset>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm((current) => current && { ...current, isDefault: event.target.checked })}
            />
            Usar como dirección principal de entrega
          </label>

          <div className="row address-form-actions">
            <button type="submit" disabled={saving || locating}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="secondary" onClick={cancelForm} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <p className="muted">Cargando…</p> : null}

      {!loading && addresses.length === 0 && !form ? (
        <div className="empty address-empty">
          <p>Todavía no tenés direcciones guardadas.</p>
          <button type="button" onClick={startCreate}>
            Agregar la primera
          </button>
        </div>
      ) : null}

      {!loading && addresses.length > 0 ? (
        <ul className="address-list">
          {addresses.map((address) => (
            <li key={address.id} className="card address-card">
              <div className="address-card-body">
                <div className="address-card-title">
                  <strong>{address.street}</strong>
                  {address.isDefault ? <span className="badge">Predeterminada</span> : null}
                </div>
                <p className="muted address-coords">
                  {toNumber(address.latitude).toFixed(4)}, {toNumber(address.longitude).toFixed(4)}
                </p>
              </div>
              <div className="row address-card-actions">
                {!address.isDefault ? (
                  <button type="button" className="secondary" onClick={() => void makeDefault(address)}>
                    Usar como predeterminada
                  </button>
                ) : null}
                <button type="button" className="secondary" onClick={() => startEdit(address)}>
                  Editar
                </button>
                <button type="button" className="danger" onClick={() => void remove(address)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
