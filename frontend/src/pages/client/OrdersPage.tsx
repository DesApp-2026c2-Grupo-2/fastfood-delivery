import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { isStatusBehind, useOrderStatusEvents } from '../../api/order-events';
import type { LoyaltyProgress, OrderSummary, RepeatOrderResult, User } from '../../api/types';
import { useCart } from '../../cart/CartContext';
import { getToken, getUserId, isCustomer } from '../../auth/session';
import { formatPrice } from '../../lib/money';
import { orderStatusLabel, showPickupBadge } from '../../lib/order-status';
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

type OrdersVariant = 'orders' | 'claims';

export function OrdersPage({ variant = 'orders' }: { variant?: OrdersVariant }) {
  const token = getToken();
  const userId = getUserId();
  const path = variant === 'claims' ? '/claims' : '/orders';

  if (!isCustomer() || !token || !userId) {
    return <Navigate to="/login" replace state={{ from: path }} />;
  }

  return <OrdersContent token={token} userId={userId} variant={variant} />;
}

function OrdersContent({
  token,
  userId,
  variant,
}: {
  token: string;
  userId: string;
  variant: OrdersVariant;
}) {
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

  const claims = variant === 'claims';
  const groups = claims
    ? [
        { title: 'Abiertos', items: orders.filter((order) => order.claimOpen) },
        { title: 'Cerrados', items: orders.filter((order) => order.hasIncident && !order.claimOpen) },
      ].filter((group) => group.items.length > 0)
    : [{ title: '', items: orders }];

  return (
    <section className="stack orders-page">
      <header className="page-head">
        <div>
          <h1>{claims ? 'Reclamos' : 'Mis pedidos'}</h1>
          <p className="muted addresses-intro">
            {claims
              ? 'Los abiertos todavía no tienen cupón, o el cupón no se usó. Los cerrados ya se usaron.'
              : 'Seguí lo que ya pediste.'}
          </p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {!claims && loyalty ? <LoyaltyStampsCard loyalty={loyalty} context="profile" /> : null}
      {loading ? <p className="muted">Cargando…</p> : null}

      {!loading && groups.every((group) => group.items.length === 0) ? (
        <div className="empty address-empty">
          {claims ? (
            <>
              <p>Todavía no hiciste ningún reclamo.</p>
              <Link to="/orders">Ver mis pedidos</Link>
            </>
          ) : (
            <>
              <p>Todavía no hiciste ningún pedido.</p>
              <Link to="/products">Ver el menú</Link>
            </>
          )}
        </div>
      ) : null}

      {!loading && groups.some((group) => group.items.length > 0) ? (
        <div className="claims-groups">
        {groups.map((group) => (
        <section className="claims-group" key={group.title || 'orders'}>
          {group.title ? <h2>{group.title}</h2> : null}
        <ul className="order-list">
          {group.items.map((order) => {
            const detailTo = claims ? `/orders/${order.id}?from=claims` : `/orders/${order.id}`;
            return (
            <li key={order.id} className={order.scheduledFor ? 'card order-card order-card--scheduled' : 'card order-card'}>
              <div className="order-card-main">
                <div className="order-card-title">
                  <Link className="order-card-date" to={detailTo}>
                    <strong>{formatDate(order.createdAt)}</strong>
                    {order.code ? <span className="order-card-code">#{order.code}</span> : null}
                  </Link>
                  {order.scheduledFor ? <span className="scheduled-badge">Programado</span> : null}
                  {showPickupBadge(order.status, order.fulfillment) ? <span className="pickup-badge">Retiro</span> : null}
                  <span className={`badge badge--${order.status}`}>
                    {orderStatusLabel(order.status, order.fulfillment)}
                  </span>
                  {order.hasIncident ? (
                    <span className={order.resolutionUnseen ? 'badge claim-badge claim-badge--unseen' : 'badge claim-badge'}>
                      {order.resolutionUnseen ? 'Nueva respuesta' : order.hasResolution ? 'Reclamo resuelto' : 'Reclamo enviado'}
                    </span>
                  ) : null}
                  {order.claimCouponCode ? <span className="badge claim-badge">Cupón de reclamo</span> : null}
                </div>
                <Link className="order-card-detail" to={detailTo}>
                  {order.branch.name}
                  {' · '}
                  {order.itemCount === 1 ? '1 producto' : `${order.itemCount} productos`}
                </Link>
                <div className="order-card-actions">
                  <Link className="text-action" to={detailTo}>
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
                  <span className="order-card-stamp" title="Este pedido sumó un mordi" aria-label="Este pedido sumó un mordi">
                    <BrandLogo size={36} className="order-card-stamp__logo" alt="" />
                  </span>
                ) : null}
                <Link className="order-card-total" to={detailTo}>
                  {formatPrice(order.totalAmount)}
                </Link>
              </div>
            </li>
            );
          })}
        </ul>
        </section>
        ))}
        </div>
      ) : null}
    </section>
  );
}