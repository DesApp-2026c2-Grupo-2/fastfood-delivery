import { type FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useOrderStatusEvents } from '../../api/order-events';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUSES,
  type AdminOrderListItem,
  type AdminOrderListResponse,
  type OrderStatus,
} from '../../api/types';
import { getToken } from '../../auth/session';

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function shortId(id: string) {
  return id.slice(-6).toUpperCase();
}

export function AdminOrdersPage() {
  const token = getToken() ?? '';
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = (searchParams.get('status') ?? '') as OrderStatus | '';
  const code = searchParams.get('code') ?? '';
  const customer = searchParams.get('customer') ?? '';
  const dateFrom = searchParams.get('from') ?? '';
  const dateTo = searchParams.get('to') ?? '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const [codeInput, setCodeInput] = useState(code);
  const [customerInput, setCustomerInput] = useState(customer);
  const [fromInput, setFromInput] = useState(dateFrom);
  const [toInput, setToInput] = useState(dateTo);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCodeInput(code);
    setCustomerInput(customer);
    setFromInput(dateFrom);
    setToInput(dateTo);
  }, [code, customer, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        if (code) params.set('code', code);
        if (customer) params.set('customer', customer);
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
        params.set('page', String(page));
        const query = params.toString();
        const result = await api<AdminOrderListResponse>(`/admin/orders?${query}`, { token });
        if (!cancelled) {
          setOrders(result.items);
          setTotal(result.total);
          setPageSize(result.pageSize);
        }
      } catch (err) {
        if (!cancelled) {
          setOrders([]);
          setTotal(0);
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, statusFilter, code, customer, dateFrom, dateTo, page]);

  useOrderStatusEvents(token, () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (code) params.set('code', code);
    if (customer) params.set('customer', customer);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    params.set('page', String(page));
    void api<AdminOrderListResponse>(`/admin/orders?${params}`, { token })
      .then((result) => {
        setOrders(result.items);
        setTotal(result.total);
        setPageSize(result.pageSize);
      })
      .catch(() => {
        /* the next explicit load will surface errors */
      });
  });

  function patchParams(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (!value || (key === 'page' && value === '1')) next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next);
  }

  function setFilter(status: OrderStatus | '') {
    patchParams({ status, page: '1' });
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    patchParams({
      code: codeInput.trim(),
      customer: customerInput.trim(),
      from: fromInput,
      to: toInput,
      page: '1',
    });
  }

  function clearSearch() {
    setCodeInput('');
    setCustomerInput('');
    setFromInput('');
    setToInput('');
    setSearchParams(statusFilter ? { status: statusFilter } : {});
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasSearch = Boolean(code || customer || dateFrom || dateTo || codeInput || customerInput || fromInput || toInput);
  const listSearch = searchParams.toString();

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Pedidos</h1>
          <p className="muted">Cambiá el estado hasta la entrega. Cada paso queda con fecha y hora.</p>
        </div>
      </header>

      <form className="admin-toolbar orders-toolbar" onSubmit={submitSearch}>
        <label className="search-label">
          Código
          <input
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="Ej. 0E3R60"
            type="search"
            autoComplete="off"
          />
        </label>
        <label className="search-label">
          Cliente
          <input
            value={customerInput}
            onChange={(event) => setCustomerInput(event.target.value)}
            placeholder="Nombre o email"
            type="search"
            autoComplete="off"
          />
        </label>
        <label className="search-label">
          Desde
          <input value={fromInput} onChange={(event) => setFromInput(event.target.value)} type="date" />
        </label>
        <label className="search-label">
          Hasta
          <input value={toInput} onChange={(event) => setToInput(event.target.value)} type="date" />
        </label>
        <div className="orders-toolbar-actions">
          <button type="submit">Buscar</button>
          {hasSearch ? (
            <button type="button" className="secondary" onClick={clearSearch}>
              Limpiar
            </button>
          ) : null}
        </div>
      </form>

      <div className="filters">
        <button type="button" className={`chip${statusFilter === '' ? ' chip-active' : ''}`} onClick={() => setFilter('')}>
          Todos
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`chip${statusFilter === status ? ' chip-active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {ORDER_STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="muted">Cargando pedidos…</p> : null}

      {!loading && orders.length === 0 && !error ? (
        <p className="empty">No hay pedidos{statusFilter ? ` en ${ORDER_STATUS_LABEL[statusFilter]}` : ''}.</p>
      ) : null}

      {!loading && orders.length > 0 ? (
        <div className="table-wrap orders-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th>Importe</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/admin/orders/${order.id}`} state={{ listSearch }}>
                      #{shortId(order.id)}
                    </Link>
                    <p className="table-slug muted">{order.itemCount} ítems</p>
                  </td>
                  <td>
                    <strong>{order.customerName}</strong>
                    {order.customerEmail ? <p className="table-slug muted">{order.customerEmail}</p> : null}
                  </td>
                  <td>{order.branch.name}</td>
                  <td>
                    <span className={`badge badge-status badge-status--${order.status}`}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td className="data-table-price">{formatPrice(order.totalAmount)}</td>
                  <td>{formatWhen(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && orders.length > 0 ? (
        <ul className="list order-card-list">
          {orders.map((order) => (
            <li key={order.id}>
              <Link className="list-item order-card" to={`/admin/orders/${order.id}`} state={{ listSearch }}>
                <div>
                  <strong>#{shortId(order.id)}</strong>
                  <p className="muted">
                    {order.customerName} · {order.branch.name}
                  </p>
                </div>
                <div className="order-card-meta">
                  <span className={`badge badge-status badge-status--${order.status}`}>
                    {ORDER_STATUS_LABEL[order.status]}
                  </span>
                  <strong>{formatPrice(order.totalAmount)}</strong>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && total > 0 ? (
        <nav className="pagination" aria-label="Paginación de pedidos">
          <button
            type="button"
            className="secondary"
            disabled={page <= 1}
            onClick={() => patchParams({ page: String(page - 1) })}
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
            onClick={() => patchParams({ page: String(page + 1) })}
          >
            Siguiente
          </button>
        </nav>
      ) : null}
    </section>
  );
}
