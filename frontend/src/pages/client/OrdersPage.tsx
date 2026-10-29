import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { isStatusBehind, useOrderStatusEvents } from '../../api/order-events';
import type { LoyaltyProgress, OrderSummary, RepeatOrderResult, User } from '../../api/types';
import { useCart } from '../../cart/CartContext';
import { getToken, getUserId, isCustomer } from '../../auth/session';
import { formatPrice } from '../../lib/money';
import { orderStatusLabel } from '../../lib/order-status';
import { BrandLogo } from '../../components/BrandLogo';
import { LoyaltyStampsCard } from '../../components/LoyaltyStampsCard';

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
  const userId = getUserId();

  if (!isCustomer() || !token || !userId) {
    return <Navigate to="/login" replace state={{ from: '/orders' }} />;
  }

  return <OrdersContent token={token} userId={userId} />;
}

function OrdersContent({ token, userId }: { token: string; userId: string }) {
  const navigate = useNavigate();
  const { count, refresh } = useCart();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyProgress | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [repeatingId, setRepeatingId] = useState('');

  async function loadOrders() {
    const [freshOrders, me] = await Promise.all([
      api<OrderSummary[]>('/orders', { token, cache: 'no-store' }),
      api<User>('/me', { token, cache: 'no-store' }).catch(() => null),
    ]);
    return { freshOrders, loyalty: me?.loyalty?.active ? me.loyalty : null };
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const next = await loadOrders();
      setOrders(next.freshOrders);
      setLoyalty(next.loyalty);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }

  async function refreshOrders() {
    try {
      const next = await loadOrders();
      setLoyalty(next.loyalty);
      setOrders((current) => {
        const shown = new Map(current.map((order) => [order.id, order.status]));
        return next.freshOrders.map((order) => {
          const status = shown.get(order.id);
          if (status && isStatusBehind(order.status, status)) return { ...order, status };
          return order;
        });
      });
    } catch {
      /* el próximo intento vuelve a pedir los pedidos */
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useOrderStatusEvents(token, userId, (event) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === event.orderId && !isStatusBehind(event.status, order.status)
          ? { ...order, status: event.status }
          : order,
      ),
    );
    void refreshOrders();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshOrders();
    }, 3000);
    return () => clearInterval(interval);
  }, [token]);

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
          <p className="muted addresses-intro">Seguí lo que ya pediste.</p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {loyalty ? <LoyaltyStampsCard loyalty={loyalty} context="profile" /> : null}
      {loading ? <p className="muted">Cargando…</p> : null}

      {!loading && orders.length === 0 ? (
        <div className="empty address-empty">
          <p>Todavía no hiciste ningún pedido.</p>
          <Link to="/products">Ver el menú</Link>
        </div>
      ) : null}

      {!loading && orders.length > 0 ? (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.id} className="card order-card">
              <div className="order-card-main">
                <div className="order-card-title">
                  <Link className="order-card-date" to={`/orders/${order.id}`}>
                    <strong>{formatDate(order.createdAt)}</strong>
                    {order.code ? <span className="order-card-code">#{order.code}</span> : null}
                  </Link>
                  {order.fulfillment === 'pickup' ? <span className="pickup-badge">Retiro</span> : null}
                  <span className={`badge badge--${order.status}`}>
                    {orderStatusLabel(order.status, order.fulfillment)}
                  </span>
                </div>
                <Link className="order-card-detail" to={`/orders/${order.id}`}>
                  {order.branch.name}
                  {' · '}
                  {order.itemCount === 1 ? '1 producto' : `${order.itemCount} productos`}
                </Link>
                <div className="order-card-actions">
                  <Link className="text-action" to={`/orders/${order.id}`}>
                    Ver detalle
                  </Link>
                  <button
                    type="button"
                    className="text-action"
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
              </div>
              <div className="order-card-side">
                {loyalty && order.loyaltyStampGranted ? (
                  <span className="order-card-stamp" title="Este pedido sumó un sello" aria-label="Este pedido sumó un sello">
                    <BrandLogo size={36} className="order-card-stamp__logo" alt="" />
                  </span>
                ) : null}
                <Link className="order-card-total" to={`/orders/${order.id}`}>
                  {formatPrice(order.totalAmount)}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}