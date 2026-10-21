import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Address } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { AddressLocationPicker } from '../../components/AddressLocationPicker';
import { useAutoClear } from '../../lib/useAutoClear';

type FormState = {
  id?: string;
  alias: string;
  street: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
};

const ALIAS_MAX = 40;

const emptyForm: FormState = {
  alias: '',
  street: '',
  latitude: '',
  longitude: '',
  isDefault: false,
};

function addressTitle(address: { alias?: string; street: string }) {
  const alias = address.alias?.trim();
  return alias || address.street;
}

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
  useAutoClear(ok, () => setOk(''));
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
      alias: address.alias ?? '',
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
    const alias = form.alias.trim();
    if (alias.length > ALIAS_MAX) {
      setError(`El alias no puede superar los ${ALIAS_MAX} caracteres.`);
      return;
    }
    if (!form.street.trim()) {
      setError('Completá la dirección.');
      return;
    }
    if (!form.latitude.trim() || !form.longitude.trim()) {
      setError('Marcá la ubicación: buscá la dirección o tocá el mapa.');
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
      alias,
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
    if (!confirm(`¿Borrar la dirección “${addressTitle(address)}”?`)) return;
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
          <p className="muted addresses-intro">
            Dónde te llevamos el pedido.{' '}
            <Link to="/branches">Ver qué sucursales llegan</Link>
          </p>
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
            Alias
            <input
              value={form.alias}
              onChange={(event) => setForm((current) => current && { ...current, alias: event.target.value })}
              maxLength={ALIAS_MAX}
              placeholder="Casa, trabajo…"
            />
            <p className="field-hint">Opcional. Sirve para reconocerla en el checkout.</p>
          </label>

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

          <AddressLocationPicker
            key={form.id ?? 'new'}
            street={form.street}
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(latitude, longitude) => setForm((current) => current && { ...current, latitude, longitude })}
            locateOnMount={!form.id}
            disabled={saving}
          />

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm((current) => current && { ...current, isDefault: event.target.checked })}
            />
            Usar como dirección principal de entrega
          </label>

          <div className="row address-form-actions">
            <button type="submit" disabled={saving}>
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
                  <strong>{addressTitle(address)}</strong>
                  {address.isDefault ? <span className="checkout-pill">Principal</span> : null}
                </div>
                {address.alias?.trim() ? <p className="checkout-choice-meta">{address.street}</p> : null}
              </div>
              <div className="address-card-actions">
                {!address.isDefault ? (
                  <button type="button" className="text-action" onClick={() => void makeDefault(address)}>
                    Hacer principal
                  </button>
                ) : null}
                <button type="button" className="text-action" onClick={() => startEdit(address)}>
                  Editar
                </button>
                <button type="button" className="text-action text-action--danger" onClick={() => void remove(address)}>
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
