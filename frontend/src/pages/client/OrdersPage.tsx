import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useOrderStatusEvents } from '../../api/order-events';
import type { OrderSummary, RepeatOrderResult } from '../../api/types';
import { useCart } from '../../cart/CartContext';
import { getToken, getUser, isCustomer } from '../../auth/session';
import { formatPrice } from '../../lib/money';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo para entregar',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrdersPage() {
  const token = getToken();
  const userId = getUser()?.id ?? '';

  if (!isCustomer() || !token || !userId) {
    return <Navigate to="/login" replace state={{ from: '/orders' }} />;
  }

  return <OrdersContent token={token} userId={userId} />;
}

function OrdersContent({ token, userId }: { token: string; userId: string }) {
  const navigate = useNavigate();
  const { count, refresh } = useCart();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [repeatingId, setRepeatingId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setOrders(await api<OrderSummary[]>('/orders', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useOrderStatusEvents(token, userId, () => {
    void api<OrderSummary[]>('/orders', { token })
      .then(setOrders)
      .catch(() => {
        /* el próximo ingreso a la pantalla muestra el error */
      });
  });

  async function repeatOrder(order: OrderSummary) {
    const hadItems = count > 0;
    setRepeatingId(order.id);
    setError('');
    try {
      const result = await api<RepeatOrderResult>(`/orders/${order.id}/repeat`, {
        method: 'POST',
        token,
      });
      await refresh();
      const messages: string[] = [];
      if (hadItems) {
        messages.push('Sumamos los ítems del pedido a lo que ya tenías en el carrito.');
      }
      if (result.skipped.length > 0) {
        messages.push(...result.skipped.map((s) => s.message));
      }
      const notice = messages.length > 0 ? messages.join(' ') : undefined;

      navigate('/cart', { state: notice ? { notice } : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo repetir el pedido');
    } finally {
      setRepeatingId('');
    }
  }

  return (
    <section className="stack orders-page">
      <header className="page-head">
        <div>
          <h1>Mis pedidos</h1>
          <p className="muted">Acá vas a ver el historial de tus pedidos anteriores.</p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="muted">Cargando…</p> : null}

      {!loading && orders.length === 0 ? (
        <div className="empty">
          <p>Todavía no hiciste ningún pedido.</p>
          <Link to="/products">Ver el menú</Link>
        </div>
      ) : null}

      {!loading && orders.length > 0 ? (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.id} className="card order-card">
              <div className="order-card-body">
                <div className="order-card-title">
                  <strong>{formatDate(order.createdAt)}</strong>
                  <span className={`badge badge--${order.status}`}>{statusLabel(order.status)}</span>
                </div>
                <p className="muted">{order.branch.name}</p>
                <p className="order-card-total">{formatPrice(order.totalAmount)}</p>
              </div>
              <div className="row order-card-actions">
                <Link className="secondary" to={`/orders/${order.id}`}>
                  Ver detalle
                </Link>
                <button
                  type="button"
                  disabled={repeatingId === order.id}
                  onClick={() => void repeatOrder(order)}
                >
                  {repeatingId === order.id
                    ? count > 0
                      ? 'Agregando…'
                      : 'Repitiendo…'
                    : count > 0
                      ? 'Agregar al carrito'
                      : 'Repetir pedido'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}