import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Product, Promotion } from '../../api/types';
import { getToken } from '../../auth/session';
import { ConfirmModal } from '../../components/ConfirmModal';

type PromoType = 'percent' | 'two_for_one';
type FormState = {
  id?: string;
  name: string;
  type: PromoType;
  value: string;
  productId: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  minSubtotal: string;
};
const NAME_MAX = 80;
const PAGE_SIZE = 20;
const emptyForm: FormState = {
  name: '',
  type: 'percent',
  value: '',
  productId: '',
  active: true,
  startsAt: '',
  endsAt: '',
  minSubtotal: '',
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

function discountLabel(promotion: Promotion): string {
  if (promotion.type === 'two_for_one') {
    return promotion.productName ? `2x1 · ${promotion.productName}` : '2x1';
  }
  const percent = `${promotion.value}%`;
  return promotion.minSubtotal != null ? `${percent} · desde ${formatMoney(promotion.minSubtotal)}` : percent;
}

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateInput(value: string, endOfDay: boolean): string | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
  return date.toISOString();
}

function rangeLabel(promotion: Promotion): string {
  if (!promotion.startsAt && !promotion.endsAt) return 'Sin límite';
  const format = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-AR') : '…');
  return `${format(promotion.startsAt)} – ${format(promotion.endsAt)}`;
}

function promotionToForm(promotion: Promotion): FormState {
  return {
    id: promotion.id,
    name: promotion.name,
    type: promotion.type,
    value: promotion.type === 'percent' ? String(promotion.value) : '',
    productId: promotion.productId ?? '',
    active: promotion.active,
    startsAt: toDateInput(promotion.startsAt),
    endsAt: toDateInput(promotion.endsAt),
    minSubtotal: promotion.minSubtotal != null ? String(promotion.minSubtotal) : '',
  };
}

function parsePercent(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  if (value < 1 || value > 100) return null;
  return value;
}

export function AdminPromotionsPage() {
  const token = getToken() ?? '';
  const navigate = useNavigate();
  const location = useLocation();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [ok, setOk] = useState((location.state as { notice?: string } | null)?.notice ?? '');
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    return promotions.filter((promotion) => {
      const haystack = `${promotion.name} ${promotion.productName ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [promotions, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = visible.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, visible.length);

  async function remove(promotion: Promotion) {
    setDeleting(true);
    setError('');
    setOk('');
    try {
      await api(`/admin/promotions/${promotion.id}`, { method: 'DELETE', token });
      setOk(`Se borró “${promotion.name}”.`);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    } finally {
      setDeleting(false);
    }
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
        <button type="button" disabled={loading} onClick={() => navigate('/admin/promotions/nueva')}>
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
            ? 'Todavía no hay promociones. Creá un porcentaje o un 2x1 para aplicarlo al confirmar.'
            : 'Ninguna promoción coincide con la búsqueda.'}
        </p>
      ) : null}

      {!loading && pageItems.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descuento</th>
                <th>Vigencia</th>
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
                  <td>{discountLabel(promotion)}</td>
                  <td>{rangeLabel(promotion)}</td>
                  <td>
                    <span className={promotion.active ? 'badge' : 'badge badge--off'}>
                      {promotion.active ? 'activa' : 'inactiva'}
                    </span>
                  </td>
                  <td className="data-table-actions">
                    <div className="row">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => navigate(`/admin/promotions/${promotion.id}`)}
                      >
                        Editar
                      </button>
                      <button type="button" className="danger" onClick={() => setPendingDelete(promotion)}>
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

      {pendingDelete ? (
        <ConfirmModal
          title="Borrar promoción"
          message={`¿Borrar “${pendingDelete.name}”? No se puede deshacer.`}
          confirmLabel="Borrar"
          busyLabel="Borrando…"
          busy={deleting}
          error={error}
          onConfirm={() => void remove(pendingDelete)}
          onClose={() => {
            if (!deleting) setPendingDelete(null);
          }}
        />
      ) : null}
    </section>
  );
}

export function AdminPromotionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = getToken() ?? '';
  const [form, setForm] = useState<FormState>(emptyForm);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const productList = await api<Product[]>('/admin/products', { token });
        if (cancelled) return;
        setProducts(productList);
        if (!id) {
          setForm(emptyForm);
          return;
        }
        const promotion = await api<Promotion>(`/admin/promotions/${id}`, { token });
        if (cancelled) return;
        setForm(promotionToForm(promotion));
      } catch (err) {
        if (!cancelled) {
          setMissing(Boolean(id));
          setError(err instanceof Error ? err.message : 'No se pudo cargar la promoción');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  function fail(message: string) {
    setError(message);
    return null;
  }

  function validate(): { name: string; value?: number; productId?: string; minSubtotal: number | null } | null {
    const name = form.name.trim();
    if (!name) return fail('Ingresá un nombre.');
    if (name.length > NAME_MAX) return fail(`El nombre puede tener hasta ${NAME_MAX} caracteres.`);
    if (form.startsAt && form.endsAt && form.startsAt > form.endsAt) {
      return fail('La fecha de inicio no puede ser posterior a la de fin.');
    }
    if (form.type === 'two_for_one') {
      if (!form.productId) return fail('Elegí el producto del 2x1.');
      return { name, productId: form.productId, minSubtotal: null };
    }
    const value = parsePercent(form.value);
    if (value == null) return fail('El porcentaje tiene que ser un entero de 1 a 100.');
    const minimumText = form.minSubtotal.trim().replace(',', '.');
    if (!minimumText) return { name, value, minSubtotal: null };
    if (!/^\d+(\.\d{1,2})?$/.test(minimumText) || Number(minimumText) <= 0) {
      return fail('El monto mínimo tiene que ser mayor a 0, con hasta dos decimales.');
    }
    return { name, value, minSubtotal: Number(minimumText) };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = validate();
    if (!payload) return;
    setSaving(true);
    setError('');
    const body = JSON.stringify({
      name: payload.name,
      type: form.type,
      active: form.active,
      startsAt: fromDateInput(form.startsAt, false),
      endsAt: fromDateInput(form.endsAt, true),
      minSubtotal: payload.minSubtotal,
      ...(form.type === 'two_for_one' ? { productId: payload.productId } : { value: payload.value }),
    });
    try {
      if (id) {
        await api(`/admin/promotions/${id}`, { method: 'PATCH', token, body });
        navigate('/admin/promotions', { state: { notice: `Promoción “${payload.name}” actualizada.` } });
      } else {
        await api('/admin/promotions', { method: 'POST', token, body });
        navigate('/admin/promotions', {
          state: {
            notice:
              form.type === 'two_for_one'
                ? `Promoción “${payload.name}” creada. Con dos unidades de ese producto, una sale gratis.`
                : `Promoción “${payload.name}” creada. Si está activa, se aplica sola al confirmar.`,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Cargando…</p>;

  if (missing) {
    return (
      <section className="stack">
        <p className="error" role="alert">
          {error || 'Promoción no encontrada'}
        </p>
        <Link to="/admin/promotions">Volver al listado</Link>
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>{id ? 'Editar promoción' : 'Crear promoción'}</h1>
          <p className="muted">
            Porcentaje de todo el pedido, o 2x1 de un producto. Si está activa, se aplica sola al confirmar.
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
          Tipo
          <select
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as PromoType }))}
          >
            <option value="percent">Porcentaje sobre el pedido</option>
            <option value="two_for_one">2x1 de un producto</option>
          </select>
        </label>
        {form.type === 'two_for_one' ? (
          <>
            <label>
              Producto
              <select
                value={form.productId}
                onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
              >
                <option value="">Elegí un producto</option>
                {products
                  .filter((product) => product.available || product.id === form.productId)
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
              </select>
            </label>
            <p className="field-hint">
              Cada dos unidades de ese producto, una sale gratis. Los adicionales se cobran igual.
            </p>
          </>
        ) : (
          <>
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
            <label>
              Monto mínimo
              <input
                value={form.minSubtotal}
                onChange={(event) => setForm((current) => ({ ...current, minSubtotal: event.target.value }))}
                inputMode="decimal"
                placeholder="Opcional"
                autoComplete="off"
              />
            </label>
            <p className="field-hint">
              Si lo completás, el porcentaje solo aplica cuando el pedido llega a ese monto.
            </p>
          </>
        )}
        <div className="date-pair">
          <label>
            Vigente desde
            <input
              type="date"
              value={form.startsAt}
              onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
            />
          </label>
          <label>
            Vigente hasta
            <input
              type="date"
              value={form.endsAt}
              onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))}
            />
          </label>
        </div>
        <p className="field-hint">Si dejás una fecha vacía, ese lado no tiene límite.</p>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
          />
          Activa
        </label>
        <div className="row">
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear promoción'}
          </button>
          <button type="button" className="secondary" onClick={() => navigate('/admin/promotions')}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
