import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Promotion } from '../../api/types';
import { getToken } from '../../auth/session';

type FormState = { id?: string; name: string; value: string; active: boolean };
type Screen = 'list' | 'form';

const NAME_MAX = 80;
const PAGE_SIZE = 20;
const emptyForm: FormState = { name: '', value: '', active: true };

function parsePercent(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  if (value < 1 || value > 100) return null;
  return value;
}

export function AdminPromotionsPage() {
  const token = getToken() ?? '';
  const [screen, setScreen] = useState<Screen>('list');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
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
      setPromotions(await api<Promotion[]>('/admin/promotions', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las promociones');
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
    if (!needle) return promotions;
    return promotions.filter((promotion) => promotion.name.toLowerCase().includes(needle));
  }, [promotions, query]);

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

  function startEdit(promotion: Promotion) {
    setForm({
      id: promotion.id,
      name: promotion.name,
      value: String(promotion.value),
      active: promotion.active,
    });
    setError('');
    setOk('');
    setScreen('form');
  }

  function validate(): { name: string; value: number } | null {
    const name = form.name.trim();
    if (!name) {
      setError('Ingresá un nombre.');
      setOk('');
      return null;
    }
    if (name.length > NAME_MAX) {
      setError(`El nombre puede tener hasta ${NAME_MAX} caracteres.`);
      setOk('');
      return null;
    }
    const value = parsePercent(form.value);
    if (value == null) {
      setError('El porcentaje tiene que ser un entero de 1 a 100.');
      setOk('');
      return null;
    }
    return { name, value };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = validate();
    if (!payload) return;
    setSaving(true);
    setError('');
    setOk('');
    const body = JSON.stringify({
      name: payload.name,
      type: 'percent',
      value: payload.value,
      active: form.active,
    });
    try {
      if (form.id) {
        await api(`/admin/promotions/${form.id}`, { method: 'PATCH', token, body });
        setOk(`Promoción “${payload.name}” actualizada.`);
      } else {
        await api('/admin/promotions', { method: 'POST', token, body });
        setOk(`Promoción “${payload.name}” creada. Si está activa, se aplica sola al confirmar.`);
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

  async function remove(promotion: Promotion) {
    if (!confirm(`¿Borrar la promoción “${promotion.name}”?`)) return;
    setError('');
    setOk('');
    try {
      await api(`/admin/promotions/${promotion.id}`, { method: 'DELETE', token });
      setOk(`Se borró “${promotion.name}”.`);
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
            <h1>{form.id ? 'Editar promoción' : 'Crear promoción'}</h1>
            <p className="muted">
              Porcentaje automático. Sin código: si está activa, se aplica al confirmar el pedido.
            </p>
          </div>
        </header>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="card form product-form" onSubmit={onSubmit} noValidate>
          <label>
            Nombre
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              maxLength={NAME_MAX}
              placeholder="Promo de la casa"
              autoComplete="off"
            />
          </label>
          <label>
            Porcentaje
            <input
              value={form.value}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
              inputMode="numeric"
              placeholder="10"
              autoComplete="off"
            />
          </label>
          <p className="field-hint">Entero de 1 a 100. Un 10 descuenta el 10% del subtotal.</p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
            />
            Activa (se ofrece en los pedidos nuevos)
          </label>
          <div className="row">
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear promoción'}
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
          <h1>Promociones</h1>
          <p className="muted">
            {promotions.length} cargadas. Entre las activas, al confirmar gana la que más descuenta.
          </p>
        </div>
        <button type="button" disabled={loading} onClick={startCreate}>
          Crear promoción
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
            placeholder="Filtrar por nombre"
            type="search"
          />
        </label>
      </div>

      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="empty">
          {promotions.length === 0
            ? 'Todavía no hay promociones. Creá un porcentaje para aplicarlo al confirmar.'
            : 'Ninguna promoción coincide con la búsqueda.'}
        </p>
      ) : null}

      {!loading && pageItems.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Porcentaje</th>
                <th>Estado</th>
                <th className="data-table-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((promotion) => (
                <tr key={promotion.id}>
                  <td>
                    <strong>{promotion.name}</strong>
                  </td>
                  <td>{promotion.value}%</td>
                  <td>
                    <span className={promotion.active ? 'badge' : 'badge badge--off'}>
                      {promotion.active ? 'activa' : 'inactiva'}
                    </span>
                  </td>
                  <td className="data-table-actions">
                    <div className="row">
                      <button type="button" className="secondary" onClick={() => startEdit(promotion)}>
                        Editar
                      </button>
                      <button type="button" className="danger" onClick={() => void remove(promotion)}>
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
        <nav className="pagination" aria-label="Paginación de promociones">
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
