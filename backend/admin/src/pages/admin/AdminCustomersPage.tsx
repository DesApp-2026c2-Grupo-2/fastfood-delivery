import { type FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import {
  ORDER_STATUS_LABEL,
  type AdminCustomer,
  type AdminCustomerDetail,
  type AdminCustomerList,
  type OrderStatus,
} from '../../api/types';
import { getToken } from '../../auth/session';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SvgIcon } from '../../icons/SvgIcon';
import { useSuccessNotice, useTimedNotice } from '../../lib/success-notice';

function formatWhen(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

type ActiveFilter = '' | 'true' | 'false';

export function AdminCustomersPage() {
  const token = getToken() ?? '';
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('');
  const [withOrders, setWithOrders] = useState(false);
  const [error, setError] = useTimedNotice();
  const [ok, setOk] = useSuccessNotice();
  const [loading, setLoading] = useState(true);
  const [pendingStatus, setPendingStatus] = useState<AdminCustomer | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  async function load(nextPage = page, search = appliedQuery, active = activeFilter, onlyWithOrders = withOrders) {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(nextPage) });
    if (search.trim()) params.set('q', search.trim());
    if (active) params.set('active', active);
    if (onlyWithOrders) params.set('withOrders', 'true');
    try {
      const data = await api<AdminCustomerList>(`/admin/customers?${params}`, { token });
      setCustomers(data.items);
      setTotal(data.total);
      setPage(data.page);
      setPageSize(data.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1, '', '', false);
    const notice = (location.state as { notice?: string } | null)?.notice;
    if (notice) setOk(notice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    setAppliedQuery(query);
    void load(1, query, activeFilter, withOrders);
  }

  function changeActive(next: ActiveFilter) {
    setActiveFilter(next);
    void load(1, appliedQuery, next, withOrders);
  }

  function changeWithOrders(next: boolean) {
    setWithOrders(next);
    void load(1, appliedQuery, activeFilter, next);
  }

  async function confirmStatus() {
    if (!pendingStatus || savingStatus) return;
    const customer = pendingStatus;
    const active = !customer.active;
    setSavingStatus(true);
    setError('');
    setOk('');
    try {
      await api(`/admin/customers/${customer.id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ active }),
      });
      setPendingStatus(null);
      setOk(active ? `${customer.name} volvió a poder entrar.` : `${customer.name} quedó deshabilitado. Los pedidos se conservan.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setSavingStatus(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Clientes</h1>
          <p className="muted">
            {total} en esta búsqueda. La baja es lógica: deja de entrar y los pedidos quedan.
          </p>
        </div>
        <button type="button" disabled={loading} onClick={() => navigate('/admin/customers/nuevo')}>
          Crear cliente
        </button>
      </header>

      {error && !pendingStatus ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="success" role="status">
          {ok}
        </p>
      ) : null}

      <form className="admin-toolbar" onSubmit={search}>
        <label className="search-label">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o email"
            type="search"
          />
        </label>
        <button type="submit" className="secondary">
          Buscar
        </button>
      </form>

      <div className="filters">
        {(
          [
            ['', 'Todos'],
            ['true', 'Activos'],
            ['false', 'Deshabilitados'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={label}
            type="button"
            className={activeFilter === value ? 'chip chip-active' : 'chip'}
            onClick={() => changeActive(value)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={withOrders ? 'chip chip-active' : 'chip'}
          onClick={() => changeWithOrders(!withOrders)}
        >
          Con pedidos
        </button>
      </div>

      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && customers.length === 0 ? (
        <p className="empty">No hay clientes para esta búsqueda.</p>
      ) : null}

      {!loading && customers.length > 0 ? (
        <>
          <div className="table-wrap mobile-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Pedidos</th>
                  <th className="data-table-price">Gastado</th>
                  <th>Estado</th>
                  <th className="data-table-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                      <p className="table-slug muted">Desde {formatWhen(customer.createdAt)}</p>
                    </td>
                    <td className="table-email" title={customer.email}>
                      {customer.email}
                    </td>
                    <td>{customer.orderCount}</td>
                    <td className="data-table-price">{formatMoney(customer.totalSpent)}</td>
                    <td>
                      <span className={customer.active ? 'badge' : 'badge badge--off'}>
                        {customer.active ? 'activo' : 'deshabilitado'}
                      </span>
                    </td>
                    <td className="data-table-actions">
                      <div className="row">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => navigate(`/admin/customers/${customer.id}`)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={customer.active ? 'danger' : 'secondary'}
                          onClick={() => setPendingStatus(customer)}
                        >
                          {customer.active ? 'Deshabilitar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="promo-card-list">
            {customers.map((customer) => (
              <li key={customer.id} className="order-card">
                <div className="order-card-top">
                  <strong>{customer.name}</strong>
                  <span className={customer.active ? 'badge' : 'badge badge--off'}>
                    {customer.active ? 'activo' : 'deshabilitado'}
                  </span>
                </div>
                <p>{customer.email}</p>
                <p className="muted">
                  {customer.orderCount} pedidos · {formatMoney(customer.totalSpent)}
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => navigate(`/admin/customers/${customer.id}`)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={customer.active ? 'danger' : 'secondary'}
                    onClick={() => setPendingStatus(customer)}
                  >
                    {customer.active ? 'Deshabilitar' : 'Activar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {!loading && pageCount > 1 ? (
        <nav className="pagination" aria-label="Paginación de clientes">
          <button
            type="button"
            className="secondary"
            disabled={page <= 1}
            onClick={() => void load(page - 1)}
          >
            Anterior
          </button>
          <p className="pagination-status">
            {from}–{to} de {total} · Página {page} de {pageCount}
          </p>
          <button
            type="button"
            className="secondary"
            disabled={page >= pageCount}
            onClick={() => void load(page + 1)}
          >
            Siguiente
          </button>
        </nav>
      ) : null}

      {pendingStatus ? (
        <ConfirmModal
          title={pendingStatus.active ? 'Deshabilitar cliente' : 'Activar cliente'}
          message={
            pendingStatus.active
              ? `${pendingStatus.name} no va a poder entrar. Los pedidos y las direcciones quedan.`
              : `${pendingStatus.name} vuelve a poder entrar con su email y contraseña.`
          }
          confirmLabel={pendingStatus.active ? 'Deshabilitar' : 'Activar'}
          busyLabel="Guardando…"
          busy={savingStatus}
          danger={pendingStatus.active}
          error={error}
          onConfirm={() => void confirmStatus()}
          onClose={() => {
            if (!savingStatus) setPendingStatus(null);
          }}
        />
      ) : null}
    </section>
  );
}

const NAME_MAX = 80;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AdminCustomerFormPage() {
  const token = getToken() ?? '';
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
  const [error, setError] = useTimedNotice();
  const [loading, setLoading] = useState(editing);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setMissing(false);
    setError('');
    void api<AdminCustomerDetail>(`/admin/customers/${id}`, { token })
      .then((customer) => {
        if (cancelled) return;
        setName(customer.name);
        setEmail(customer.email);
        setDetail(customer);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMissing(true);
        setError(err instanceof Error ? err.message : 'No se pudo cargar el cliente');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function validate(): string | null {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) return 'El nombre es obligatorio.';
    if (trimmedName.length > NAME_MAX) return `El nombre no puede superar los ${NAME_MAX} caracteres.`;
    if (!isEmail(trimmedEmail)) return 'El email no es válido.';
    if (!editing && password.length < PASSWORD_MIN) {
      return `La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres.`;
    }
    if (password.length > PASSWORD_MAX) {
      return `La contraseña no puede superar los ${PASSWORD_MAX} caracteres.`;
    }
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError('');
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    try {
      if (id) {
        await api(`/admin/customers/${id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ name: trimmedName, email: trimmedEmail }),
        });
        navigate('/admin/customers', { state: { notice: `Cliente “${trimmedName}” actualizado.` } });
      } else {
        await api('/admin/customers', {
          method: 'POST',
          token,
          body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password }),
        });
        navigate('/admin/customers', { state: { notice: `${trimmedName} ya puede entrar con ${trimmedEmail}.` } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="stack">
        <p className="muted">Cargando cliente…</p>
      </section>
    );
  }

  if (missing) {
    return (
      <section className="stack">
        <p className="error" role="alert">
          {error || 'Cliente no encontrado.'}
        </p>
        <Link className="btn-back" to="/admin/customers">
          ← Volver al listado
        </Link>
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>{editing ? 'Editar cliente' : 'Crear cliente'}</h1>
          <p className="muted">
            {editing
              ? 'El nombre y el email se pueden cambiar. La contraseña la recupera el cliente.'
              : 'Queda como cliente y puede entrar con este email y esta contraseña.'}
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
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={NAME_MAX} autoComplete="name" />
        </label>
        <label>
          Email
          <input
            type="text"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="off"
          />
        </label>
        {editing ? null : (
          <label>
            Contraseña inicial
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                maxLength={PASSWORD_MAX}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
              >
                <SvgIcon name={showPassword ? 'eye-off' : 'eye'} />
              </button>
            </span>
            <p className="field-hint">Mínimo {PASSWORD_MIN} caracteres. Después la puede cambiar desde su cuenta.</p>
          </label>
        )}
        <div className="row">
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cliente'}
          </button>
          <button type="button" className="secondary" onClick={() => navigate('/admin/customers')}>
            Cancelar
          </button>
        </div>
      </form>

      {detail ? (
        <article className="card order-detail-card">
          <h2>Actividad</h2>
          <p className="muted">
            {detail.orderCount} pedidos · {formatMoney(detail.totalSpent)}
            {detail.lastOrderAt ? ` · último ${formatWhen(detail.lastOrderAt)}` : ''}
          </p>
          <h3>Direcciones</h3>
          {detail.addresses.length === 0 ? (
            <p className="muted">No cargó direcciones.</p>
          ) : (
            <ul>
              {detail.addresses.map((address) => (
                <li key={address.id}>
                  {address.alias ? `${address.alias}: ` : ''}
                  {address.street}
                  {address.isDefault ? ' · predeterminada' : ''}
                </li>
              ))}
            </ul>
          )}
          <h3>Pedidos recientes</h3>
          {detail.recentOrders.length === 0 ? (
            <p className="muted">Todavía no hizo pedidos.</p>
          ) : (
            <ul>
              {detail.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link to={`/admin/orders/${order.id}`}>
                    {formatWhen(order.createdAt)} · {ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status} ·{' '}
                    {order.branch.name} · {formatMoney(order.totalAmount)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}
    </section>
  );
}
