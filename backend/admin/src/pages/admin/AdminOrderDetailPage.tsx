import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useOrderStatusEvents } from '../../api/order-events';
import { orderStatusLabel, type AdminOrderDetail, type OrderStatus } from '../../api/types';
import { getToken } from '../../auth/session';
import { ConfirmModal } from '../../components/ConfirmModal';
import { OrderCode } from '../../components/OrderCode';
import { mediaUrl } from '../../lib/media';
import { orderTimingText } from '../../lib/order-timing';
import { useTimedNotice } from '../../lib/success-notice';

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
}

function discountCaption(name: string | null, type: 'percent' | 'two_for_one' | null, value: number | null) {
  const kind = type === 'two_for_one' ? '2x1' : type === 'percent' && value ? `${value}%` : '';
  if (kind && name) return `${kind} · ${name}`;
  return kind || name || '';
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function nextForward(nextStatuses: OrderStatus[]): OrderStatus | undefined {
  return nextStatuses.find((status) => status !== 'cancelled');
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const token = getToken() ?? '';
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useTimedNotice();
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

  useEffect(() => {
    if (!id || saving) return;
    const interval = setInterval(() => {
      void load();
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, saving]);

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
      setPendingStatus(null);
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
  const timing = orderTimingText(order);
  const promoCaption = discountCaption(order.promotionName, order.promotionType, order.promotionValue);

  return (
    <section className="stack">
      <Link className="btn-back" to={backTo}>
        ← Volver al listado
      </Link>

      <header className="page-head">
        <div>
          <h1 className="order-title">
            Pedido <OrderCode id={order.id} code={order.code} wrap />
          </h1>
          <p className="muted">{formatWhen(order.createdAt)}</p>
          {timing.eta ? <p className="muted">{timing.eta}</p> : null}
          {timing.delay ? <p className="badge badge-delay">{timing.delay}</p> : null}
        </div>
        <div className="order-status-marks">
          {order.fulfillment === 'pickup' ? <span className="pickup-badge">Retiro</span> : null}
          <span className={`badge badge-status badge-status--${order.status}`}>
            {orderStatusLabel(order.status, order.fulfillment)}
          </span>
        </div>
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
            onClick={() => {
              setError('');
              setPendingStatus(forward);
            }}
          >
            Pasar a {orderStatusLabel(forward, order.fulfillment)}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            className="danger"
            disabled={saving}
            onClick={() => {
              setError('');
              setPendingStatus('cancelled');
            }}
          >
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
          {order.address ? (
            <>
              Dirección:{' '}
              <strong>
                {order.address.alias?.trim() ? `${order.address.alias.trim()} · ` : ''}
                {order.address.street}
              </strong>
            </>
          ) : (
            <>
              Entrega: <strong>Retiro en sucursal</strong>
            </>
          )}
        </p>
        {order.status !== 'cancelled' && order.etaMinutes != null && order.etaMinutes > 0 ? (
          <p>
            Faltan <strong>{order.etaMinutes} min</strong>
          </p>
        ) : null}
        {order.discountAmount > 0 ? (
          <>
            <p>
              Subtotal: <strong>{formatPrice(order.subtotal)}</strong>
            </p>
            <p>
              Descuento{promoCaption ? ` (${promoCaption})` : ''}:{' '}
              <strong>−{formatPrice(order.discountAmount)}</strong>
            </p>
          </>
        ) : null}
        <p className="price">{formatPrice(order.totalAmount)}</p>
      </article>

      <article className="card order-detail-card">
        <h2>Ítems</h2>
        <ul className="order-lines">
          {order.items.map((item) => (
            <li key={item.id} className="order-line">
              {item.product.imageUrl ? (
                <img src={mediaUrl(item.product.imageUrl)} alt="" />
              ) : (
                <span className="order-line-photo" />
              )}
              <div className="order-line-info">
                <strong>{item.product.name}</strong>
                {item.notes ? <p className="muted">{item.notes}</p> : null}
              </div>
              <div className="order-line-amounts">
                <span>{item.quantity}×</span>
                <strong>{formatPrice(item.subtotal)}</strong>
              </div>
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
                <strong>{orderStatusLabel(event.status, order.fulfillment)}</strong>
                <p className="muted">
                  {formatWhen(event.changedAt)} · {event.changedByName}
                </p>
              </li>
            ))}
          </ol>
        )}
      </article>
      {pendingStatus ? (
        <ConfirmModal
          title={pendingStatus === 'cancelled' ? 'Cancelar pedido' : 'Cambiar estado'}
          message={
            pendingStatus === 'cancelled'
              ? 'El pedido se cancela y no se puede volver atrás.'
              : `El pedido pasa a ${orderStatusLabel(pendingStatus, order.fulfillment)}. Este paso no se puede deshacer.`
          }
          confirmLabel={
            pendingStatus === 'cancelled' ? 'Cancelar pedido' : `Pasar a ${orderStatusLabel(pendingStatus, order.fulfillment)}`
          }
          busyLabel="Guardando…"
          busy={saving}
          danger={pendingStatus === 'cancelled'}
          error={error}
          onConfirm={() => void changeStatus(pendingStatus)}
          onClose={() => {
            if (!saving) {
              setPendingStatus(null);
              setError('');
            }
          }}
        />
      ) : null}
    </section>
  );
}
