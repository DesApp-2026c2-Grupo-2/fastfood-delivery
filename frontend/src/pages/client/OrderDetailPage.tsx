import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { OrderDetail } from '../../api/types';
import { getToken } from '../../auth/session';
import { formatDateTime, formatPrice } from '../../lib/money';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo para entregar',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = getToken() ?? '';
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadOrder() {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const data = await api<OrderDetail>(`/orders/${id}`, { token });
        if (!cancelled) setOrder(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el pedido');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOrder();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  async function handleCancel() {
    if (!id) return;
    setCancelling(true);
    setCancelError('');
    try {
      const updated = await api<OrderDetail>(`/orders/${id}/cancel`, {
        method: 'POST',
        token,
      });
      setOrder(updated);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'No se pudo cancelar el pedido');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <p className="muted">Buscando tu pedido…</p>;

  if (error || !order) {
    return (
      <section className="stack">
        <p className="error" role="alert">
          {error || 'Pedido no encontrado'}
        </p>
        <Link to="/products">← Volver al menú</Link>
      </section>
    );
  }

  const isTerminal = order.status === 'delivered' || order.status === 'cancelled';
  const showCancel =
    order.canCancel ?? (order.status === 'pending' || order.status === 'confirmed');

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <div className="detail-back-action">
            <Link to="/products" className="back-link">
              ← Mis pedidos
            </Link>
          </div>
          <h1>Seguimiento de pedido</h1>
          <p className="muted">
            Código: <span className="order-id">{order.id}</span>
          </p>
        </div>
        <span className={`badge ${order.status === 'cancelled' ? 'badge--off' : ''}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </header>

      {/* Estimación de entrega */}
      {!isTerminal && order.etaMinutes !== undefined && order.etaMinutes !== null ? (
        <div className="card eta-card">
          <h2>Tiempo estimado de entrega</h2>
          <p className="eta-highlight">
            Aprox. <strong>{order.etaMinutes} minutos</strong>
          </p>
        </div>
      ) : null}

      {/* Sucursal asignada */}
      <div className="card">
        <h2>Sucursal asignada</h2>
        <p>
          <strong>{order.branch.name}</strong>
        </p>
        {order.branch.address ? (
          <p className="muted">{order.branch.address}</p>
        ) : null}
      </div>

      {/* Historial / Timeline */}
      <div className="card">
        <h2>Historial del pedido</h2>
        {order.history && order.history.length > 0 ? (
          <ul className="timeline">
            {order.history.map((h) => (
              <li key={h.id} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <strong>{STATUS_LABELS[h.status] ?? h.status}</strong>
                  <small className="muted">{formatDateTime(h.changedAt)}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Sin movimientos registrados aún.</p>
        )}
      </div>

      {/* Detalle de la compra */}
      <div className="card">
        <h2>Detalle de la compra</h2>
        <p>
          <strong>Entrega en:</strong> {order.address.street}
        </p>
        <p className="muted">Fecha de creación: {formatDateTime(order.createdAt)}</p>
        <ul className="order-items">
          {order.items.map((item) => (
            <li key={item.id}>
              {item.quantity} × {item.product.name} — {formatPrice(item.subtotal)}
              {item.notes ? <small className="muted"> ({item.notes})</small> : null}
            </li>
          ))}
        </ul>
        <p className="total-row">
          <span>Importe total</span>
          <strong>{formatPrice(order.totalAmount)}</strong>
        </p>
      </div>

      <div id="order-actions" className="order-actions">
        {showCancel ? (
          <>
            <button
              type="button"
              className="danger"
              disabled={cancelling}
              onClick={() => void handleCancel()}
            >
              {cancelling ? 'Cancelando…' : 'Cancelar pedido'}
            </button>
            {cancelError ? (
              <p className="error" role="alert">
                {cancelError}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}