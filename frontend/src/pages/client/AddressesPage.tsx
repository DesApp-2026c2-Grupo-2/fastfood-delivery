import { type FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Address } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';

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

  function startCreate() {
    setForm(emptyForm);
    setError('');
    setOk('');
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
  }

  function cancelForm() {
    setForm(null);
    setError('');
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

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Mis direcciones</h1>
          <p className="muted">Cargá latitud y longitud a mano. Sin mapa en este sprint.</p>
        </div>
        {!form ? (
          <button type="button" onClick={startCreate}>
            Agregar dirección
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
        <form className="card form" onSubmit={onSubmit}>
          <h2>{form.id ? 'Editar dirección' : 'Nueva dirección'}</h2>
          <label>
            Dirección
            <input
              value={form.street}
              onChange={(event) => setForm((current) => current && { ...current, street: event.target.value })}
              required
              maxLength={200}
              placeholder="Av. Rivadavia 5000, CABA"
            />
          </label>
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
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm((current) => current && { ...current, isDefault: event.target.checked })}
            />
            Usar como dirección principal de entrega
          </label>
          <div className="row">
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="secondary" onClick={cancelForm}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && addresses.length === 0 ? (
        <p className="empty">Todavía no tenés direcciones guardadas.</p>
      ) : null}

      {!loading && addresses.length > 0 ? (
        <ul className="address-list">
          {addresses.map((address) => (
            <li key={address.id} className="card address-card">
              <div>
                <strong>{address.street}</strong>
                {address.isDefault ? <span className="badge">Principal</span> : null}
                <p className="muted">
                  {toNumber(address.latitude).toFixed(4)}, {toNumber(address.longitude).toFixed(4)}
                </p>
              </div>
              <div className="row">
                <button type="button" className="secondary" onClick={() => startEdit(address)}>
                  Editar
                </button>
                <button type="button" className="danger" onClick={() => void remove(address)}>
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
