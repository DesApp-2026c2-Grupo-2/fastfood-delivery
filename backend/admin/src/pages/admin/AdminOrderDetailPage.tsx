import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useOrderStatusEvents } from '../../api/order-events';
import { ORDER_STATUS_LABEL, type AdminOrderDetail, type OrderStatus } from '../../api/types';
import { getToken } from '../../auth/session';
import { mediaUrl } from '../../lib/media';

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function shortId(id: string) {
  return id.slice(-6).toUpperCase();
}

function nextForward(nextStatuses: OrderStatus[]): OrderStatus | undefined {
  return nextStatuses.find((status) => status !== 'cancelled');
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const token = getToken() ?? '';
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch;
  const backTo = listSearch ? `/admin/orders?${listSearch}` : '/admin/orders';

  async function load() {
    setError('');
    try {
      setOrder(await api<AdminOrderDetail>(`/admin/orders/${id}`, { token }));
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : 'No se pudo cargar el pedido');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  useOrderStatusEvents(token, (event) => {
    if (event.orderId === id) void load();
  });

  async function changeStatus(status: OrderStatus) {
    if (!order) return;
    setSaving(true);
    setError('');
    try {
      const path = status === 'cancelled' ? `/admin/orders/${order.id}/cancel` : `/admin/orders/${order.id}/status`;
      const body = status === 'cancelled' ? undefined : JSON.stringify({ status });
      setOrder(
        await api<AdminOrderDetail>(path, {
          method: 'POST',
          token,
          body,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setSaving(false);
    }
  }

  if (!order && !error) {
    return <p className="muted">Cargando pedido…</p>;
  }

  if (!order) {
    return (
      <section className="stack">
        <p className="error" role="alert">
          {error}
        </p>
        <Link className="btn-back" to={backTo}>
          ← Volver al listado
        </Link>
      </section>
    );
  }

  const forward = nextForward(order.nextStatuses);
  const canCancel = order.nextStatuses.includes('cancelled');

  return (
    <section className="stack">
      <Link className="btn-back" to={backTo}>
        ← Volver al listado
      </Link>

      <header className="page-head">
        <div>
          <h1>Pedido #{shortId(order.id)}</h1>
          <p className="muted">{formatWhen(order.createdAt)}</p>
        </div>
        <span className={`badge badge-status badge-status--${order.status}`}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="row order-status-actions">
        {forward ? (
          <button
            type="button"
            className={`btn-status btn-status--${forward}`}
            disabled={saving}
            onClick={() => void changeStatus(forward)}
          >
            Pasar a {ORDER_STATUS_LABEL[forward]}
          </button>
        ) : null}
        {canCancel ? (
          <button type="button" className="danger" disabled={saving} onClick={() => void changeStatus('cancelled')}>
            Cancelar pedido
          </button>
        ) : null}
      </div>

      <article className="card order-detail-card">
        <h2>Cliente y entrega</h2>
        <p>
          <strong>{order.customerName}</strong>
          {order.customerEmail ? (
            <>
              <br />
              <span className="muted">{order.customerEmail}</span>
            </>
          ) : null}
        </p>
        <p>
          Sucursal: <strong>{order.branch.name}</strong>
          <br />
          <span className="muted">{order.branch.address}</span>
        </p>
        <p>
          Dirección: <strong>{order.address.street}</strong>
        </p>
        {order.etaMinutes != null ? <p>Tiempo estimado: <strong>{order.etaMinutes} min</strong></p> : null}
        <p className="price">{formatPrice(order.totalAmount)}</p>
      </article>

      <article className="card order-detail-card">
        <h2>Ítems</h2>
        <ul className="list">
          {order.items.map((item) => (
            <li key={item.id} className="list-item list-item--product">
              {item.product.imageUrl ? (
                <img className="list-thumb" src={mediaUrl(item.product.imageUrl)} alt="" />
              ) : (
                <span className="list-thumb" />
              )}
              <div>
                <strong>
                  {item.quantity} × {item.product.name}
                </strong>
                {item.notes ? <p className="muted">{item.notes}</p> : null}
              </div>
              <strong>{formatPrice(item.subtotal)}</strong>
            </li>
          ))}
        </ul>
      </article>

      <article className="card order-detail-card">
        <h2>Historial</h2>
        {order.history.length === 0 ? (
          <p className="muted">Todavía no hay cambios de estado.</p>
        ) : (
          <ol className="order-timeline">
            {order.history.map((event) => (
              <li key={event.id}>
                <strong>{ORDER_STATUS_LABEL[event.status]}</strong>
                <p className="muted">
                  {formatWhen(event.changedAt)} · {event.changedByName}
                </p>
              </li>
            ))}
          </ol>
        )}
      </article>
    </section>
  );
}
