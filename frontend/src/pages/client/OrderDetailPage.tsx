import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { isStatusBehind, useOrderStatusEvents, type OrderStatusChangedEvent } from '../../api/order-events';
import type { OrderDetail, OrderStatus, Product } from '../../api/types';
import { getToken, getUserId } from '../../auth/session';
import { formatDateTime, formatPrice } from '../../lib/money';
import { mediaUrl } from '../../lib/media';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo para entregar',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function applyStatusEvent(order: OrderDetail | null, event: OrderStatusChangedEvent): OrderDetail | null {
  if (!order || isStatusBehind(event.status, order.status)) return order;
  const history = order.history ?? [];
  const already = history.some((item) => item.status === event.status);
  return {
    ...order,
    status: event.status,
    canCancel: event.status === 'pending' || event.status === 'confirmed',
    history: already
      ? history
      : [
          ...history,
          {
            id: `live-${event.orderId}-${event.status}`,
            status: event.status as OrderStatus,
            changedAt: event.changedAt,
          },
        ],
  };
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = getToken() ?? '';
  const userId = getUserId();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const [orderData, productsData] = await Promise.all([
          api<OrderDetail>(`/orders/${id}`, { token, cache: 'no-store' }),
          api<Product[]>('/products').catch(() => []),
        ]);
        if (!cancelled) {
          setOrder(orderData);
          setAllProducts(productsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el pedido');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const isTerminal = order?.status === 'delivered' || order?.status === 'cancelled';

  // Actualiza el reloj cada 30 segundos para descontar minutos mientras se mira la pantalla
  useEffect(() => {
    if (isTerminal) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [isTerminal]);

  useEffect(() => {
    if (!id || !token || isTerminal) return;
    const interval = setInterval(() => {
      void api<OrderDetail>(`/orders/${id}`, { token, cache: 'no-store' })
        .then((orderData) => {
          setOrder((current) => {
            if (current && isStatusBehind(orderData.status, current.status)) return current;
            return orderData;
          });
          setNow(Date.now());
        })
        .catch(() => {
          /* el próximo intento vuelve a pedir el estado */
        });
    }, 3000);
    return () => clearInterval(interval);
  }, [id, token, isTerminal]);

  useOrderStatusEvents(token, userId, (event) => {
    if (!id || event.orderId !== id) return;
    setOrder((current) => applyStatusEvent(current, event));
    setNow(Date.now());
    void api<OrderDetail>(`/orders/${id}`, { token, cache: 'no-store' })
      .then((orderData) => {
        setOrder((current) => {
          if (current && isStatusBehind(orderData.status, current.status)) return current;
          return orderData;
        });
        setNow(Date.now());
      })
      .catch(() => {
        /* el estado del evento queda en pantalla hasta la próxima carga */
      });
  });

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
        <Link to="/orders">← Volver a mis pedidos</Link>
      </section>
    );
  }

  const showCancel =
    order.canCancel ?? (order.status === 'pending' || order.status === 'confirmed');

  const reversedHistory = order.history ? [...order.history].reverse() : [];

  // DEV-14 y DEV-15: Hora estimada fija y minutos restantes reales
  let targetDeliveryDate: Date | null = null;

  if (order.estimatedDeliveryAt) {
    const parsed = new Date(order.estimatedDeliveryAt);
    if (!isNaN(parsed.getTime())) targetDeliveryDate = parsed;
  } else if (order.createdAt && typeof order.etaMinutes === 'number') {
    const created = new Date(order.createdAt);
    if (!isNaN(created.getTime())) {
      targetDeliveryDate = new Date(created.getTime() + order.etaMinutes * 60_000);
    }
  }

  const estimatedTimeFormatted = targetDeliveryDate
    ? new Intl.DateTimeFormat('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(targetDeliveryDate)
    : '';

  // Minutos que realmente faltan a partir de la hora actual
  const remainingMinutes = targetDeliveryDate
    ? Math.max(0, Math.ceil((targetDeliveryDate.getTime() - now) / 60_000))
    : order.etaMinutes ?? 0;

  // Demora si la hora actual superó la hora prometida
  let currentDelayMinutes = order.delayMinutes ?? 0;
  if (
    !isTerminal &&
    targetDeliveryDate &&
    (order.delayMinutes === undefined || order.delayMinutes === null)
  ) {
    const diffMinutes = Math.floor((now - targetDeliveryDate.getTime()) / 60_000);
    currentDelayMinutes = diffMinutes > 0 ? diffMinutes : 0;
  }

  const isDelayed = currentDelayMinutes > 0;

  return (
    <section className="tracking-page">
      <div className="detail-back-action">
        <Link to="/orders" className="back-link">
          ← Mis pedidos
        </Link>
      </div>

      <header className="tracking-header">
        <div>
          <h1>Seguimiento de pedido</h1>
          <p className="tracking-code">
            Código: <code>{order.id}</code>
          </p>
        </div>
        <span className={`tracking-badge tracking-badge--${order.status}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </header>

      {/* Bloque 1: Estado, ETA, Demora, Sucursal y Timeline */}
      <div className="tracking-card">
        <div className="delivery-status-banner">
          <div className="eta-block">
            <span className="banner-sublabel">Estado del pedido</span>
            <strong className={`eta-time tracking-headline tracking-headline--${order.status}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </strong>
            {order.status === 'cancelled' ? null : !isTerminal ? (
              isDelayed ? (
                <>
                  <span className="banner-sublabel banner-sublabel--late">Demorado {currentDelayMinutes} min</span>
                  {estimatedTimeFormatted ? (
                    <small className="banner-note">Hora pactada: {estimatedTimeFormatted} hs</small>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="banner-sublabel">
                    {estimatedTimeFormatted
                      ? `Llega aprox. ${estimatedTimeFormatted} hs`
                      : `Aprox. ${remainingMinutes} minutos`}
                  </span>
                  {estimatedTimeFormatted && remainingMinutes > 0 ? (
                    <small className="banner-note">en aprox. {remainingMinutes} minutos</small>
                  ) : null}
                </>
              )
            ) : order.status === 'delivered' && isDelayed ? (
              <span className="banner-sublabel banner-sublabel--late">
                Entregado con {currentDelayMinutes} min de demora
              </span>
            ) : null}
          </div>

          <div className="branch-meta-block">
            <span className="banner-sublabel">Sucursal asignada</span>
            <strong className="branch-meta-name">{order.branch.name}</strong>
            {order.branch.address ? (
              <span className="branch-meta-address">{order.branch.address}</span>
            ) : null}
          </div>
        </div>

        <div className="history-section">
          <h3 className="tracking-section-title">Historial del pedido</h3>
          {reversedHistory.length > 0 ? (
            <ul className="timeline">
              {reversedHistory.map((h, idx) => {
                const isLatest = idx === 0;
                return (
                  <li
                    key={h.id}
                    className={`timeline-item ${isLatest ? 'timeline-item--current' : ''}`}
                  >
                    <div className="timeline-dot" />
                    <div className="timeline-info">
                      <span className="timeline-status">
                        {STATUS_LABELS[h.status] ?? h.status}
                      </span>
                      <small className="timeline-date">{formatDateTime(h.changedAt)}</small>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Sin movimientos registrados aún.</p>
          )}
        </div>
      </div>

      {/* Bloque 2: Detalle de la compra */}
      <div className="tracking-card">
        <h2>Resumen</h2>

        <dl className="order-confirmed-facts">
          <div>
            <dt>{order.address ? 'Entrega' : 'Retiro'}</dt>
            <dd>
              {order.address
                ? `${order.address.alias?.trim() ? `${order.address.alias.trim()} · ` : ''}${order.address.street}`
                : order.branch.address}
            </dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{formatDateTime(order.createdAt)}</dd>
          </div>
        </dl>

        <div className="items-list">
          {order.items.map((item) => {
            const hasExtras = Array.isArray(item.extras) && item.extras.length > 0;

            let userNote = item.notes?.trim() || '';
            if (
              userNote.toLowerCase().startsWith('extras:') ||
              userNote.toLowerCase().startsWith('con:')
            ) {
              userNote = '';
            }

            return (
              <div key={item.id} className="order-detail-item">
                <span className="checkout-line">
                  {item.product.imageUrl ? (
                    <img src={mediaUrl(item.product.imageUrl)} alt="" />
                  ) : (
                    <span className="checkout-line-photo" aria-hidden="true" />
                  )}
                  <span className="checkout-line-name">
                    <span className="checkout-qty">{item.quantity}</span>
                    {item.product.name}
                  </span>
                  <span className="checkout-line-price">{formatPrice(item.subtotal)}</span>
                </span>

                {hasExtras ? (
                  <div className="order-detail-extras">
                    {item.extras!.map((extra, idx) => {
                      const matchedProduct = allProducts.find(
                        (p) =>
                          p.id === extra.id ||
                          p.name.toLowerCase().trim() === extra.name.toLowerCase().trim(),
                      );
                      const finalImage = extra.imageUrl || matchedProduct?.imageUrl;
                      const extraPrice = extra.price || matchedProduct?.price;

                      return (
                        <div key={extra.id ?? idx} className="order-detail-extra">
                          {finalImage ? (
                            <img src={mediaUrl(finalImage)} alt="" />
                          ) : (
                            <span className="order-detail-extra-fallback" aria-hidden="true" />
                          )}
                          <span>{extra.name}</span>
                          {extraPrice ? <span className="order-detail-extra-price">+{formatPrice(extraPrice)}</span> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {userNote ? <p className="order-detail-note">{userNote}</p> : null}
              </div>
            );
          })}
        </div>

        <div className="total-divider" />

        <div className="total-line">
          <span>Total</span>
          <span className="total-amount">{formatPrice(order.totalAmount)}</span>
        </div>
      </div>

      {/* Cancelar pedido */}
      {showCancel && (
        <div className="cancel-wrapper">
          <button
            type="button"
            className="btn-cancel-action"
            disabled={cancelling}
            onClick={() => void handleCancel()}
          >
            {cancelling ? 'Cancelando pedido…' : 'Cancelar pedido'}
          </button>
          {cancelError && (
            <p className="error" role="alert">
              {cancelError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}