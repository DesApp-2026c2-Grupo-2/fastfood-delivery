import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Branch } from '../../api/types';
import { getToken } from '../../auth/session';

type FormState = {
  id?: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  phone: string;
  active: boolean;
};

type Screen = 'list' | 'form';

const emptyForm: FormState = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  openingHours: 'Lun-Dom 10:00-23:00',
  phone: '',
  active: true,
};

const PAGE_SIZE = 20;

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

export function AdminBranchesPage() {
  const token = getToken() ?? '';
  const [screen, setScreen] = useState<Screen>('list');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setBranches(await api<Branch[]>('/admin/branches', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las sucursales');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return branches;
    return branches.filter(
      (branch) =>
        branch.name.toLowerCase().includes(needle) ||
        branch.address.toLowerCase().includes(needle) ||
        branch.phone.toLowerCase().includes(needle),
    );
  }, [branches, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = visible.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, visible.length);

  function resetForm() {
    setForm(emptyForm);
  }

  function goToList() {
    resetForm();
    setScreen('list');
  }

  function startCreate() {
    resetForm();
    setError('');
    setOk('');
    setScreen('form');
  }

  function startEdit(branch: Branch) {
    setForm({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      latitude: String(toNumber(branch.latitude)),
      longitude: String(toNumber(branch.longitude)),
      openingHours: branch.openingHours,
      phone: branch.phone,
      active: branch.active,
    });
    setError('');
    setOk('');
    setScreen('form');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!form.name.trim() || !form.address.trim()) {
      setError('Completá nombre y dirección.');
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
      name: form.name.trim(),
      address: form.address.trim(),
      latitude,
      longitude,
      openingHours: form.openingHours.trim(),
      phone: form.phone.trim(),
      active: form.active,
    };

    setSaving(true);
    setError('');
    setOk('');
    try {
      if (form.id) {
        await api(`/admin/branches/${form.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload),
        });
        setOk(`Sucursal “${payload.name}” actualizada.`);
      } else {
        await api('/admin/branches', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
        setOk(`Sucursal “${payload.name}” creada.`);
      }
      resetForm();
      setScreen('list');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(branch: Branch) {
    if (!confirm(`¿Borrar la sucursal “${branch.name}”?`)) return;
    setError('');
    setOk('');
    try {
      await api(`/admin/branches/${branch.id}`, { method: 'DELETE', token });
      setOk(`Se borró “${branch.name}”.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    }
  }

  if (screen === 'form') {
    return (
      <section className="stack">
        <header className="page-head">
          <div>
            <h1>{form.id ? 'Editar sucursal' : 'Crear sucursal'}</h1>
            <p className="muted">Latitud y longitud se cargan a mano (sin mapa).</p>
          </div>
        </header>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="card form product-form" onSubmit={onSubmit}>
          <label>
            Nombre
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              maxLength={120}
              placeholder="Mordi Centro"
            />
          </label>
          <label>
            Dirección
            <input
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              required
              maxLength={200}
              placeholder="Av. Corrientes 1234, CABA"
            />
          </label>
          <div className="row">
            <label>
              Latitud
              <input
                value={form.latitude}
                onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                required
                inputMode="decimal"
                placeholder="-34.6037"
              />
            </label>
            <label>
              Longitud
              <input
                value={form.longitude}
                onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                required
                inputMode="decimal"
                placeholder="-58.3816"
              />
            </label>
          </div>
          <label>
            Horarios
            <input
              value={form.openingHours}
              onChange={(event) => setForm((current) => ({ ...current, openingHours: event.target.value }))}
              required
              maxLength={200}
              placeholder="Lun-Dom 10:00-23:00"
            />
          </label>
          <label>
            Teléfono
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
              maxLength={40}
              placeholder="+54 11 4000-0000"
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
            />
            Sucursal activa (puede recibir pedidos nuevos)
          </label>
          <div className="row">
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear sucursal'}
            </button>
            <button type="button" className="secondary" onClick={goToList}>
              Cancelar
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Sucursales</h1>
          <p className="muted">{branches.length} locales cargados. Las inactivas no se asignan a pedidos nuevos.</p>
        </div>
        <button type="button" disabled={loading} onClick={startCreate}>
          Crear sucursal
        </button>
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

      <div className="admin-toolbar">
        <label className="search-label">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por nombre, dirección o teléfono"
            type="search"
          />
        </label>
      </div>

      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="empty">
          {branches.length === 0
            ? 'Todavía no hay sucursales. Creá la primera para poder asignar pedidos.'
            : 'Ninguna sucursal coincide con la búsqueda.'}
        </p>
      ) : null}

      {!loading && pageItems.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th className="data-table-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((branch) => (
                <tr key={branch.id}>
                  <td>
                    <strong>{branch.name}</strong>
                    <br />
                    <span className="muted">{branch.phone}</span>
                  </td>
                  <td>
                    {branch.address}
                    <br />
                    <span className="muted">
                      {toNumber(branch.latitude).toFixed(4)}, {toNumber(branch.longitude).toFixed(4)}
                    </span>
                  </td>
                  <td>{branch.active ? 'Activa' : 'Inactiva'}</td>
                  <td className="data-table-actions">
                    <div className="row">
                      <button type="button" className="secondary" onClick={() => startEdit(branch)}>
                        Editar
                      </button>
                      <button type="button" className="danger" onClick={() => void remove(branch)}>
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && visible.length > 0 ? (
        <nav className="pagination" aria-label="Paginación de sucursales">
          <button
            type="button"
            className="secondary"
            disabled={currentPage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Anterior
          </button>
          <p className="pagination-status">
            {from}–{to} de {visible.length} · Página {currentPage} de {pageCount}
          </p>
          <button
            type="button"
            className="secondary"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
            Siguiente
          </button>
        </nav>
      ) : null}
    </section>
  );
}
