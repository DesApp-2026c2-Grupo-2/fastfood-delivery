import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { isStatusBehind, useOrderStatusEvents, type OrderStatusChangedEvent } from '../../api/order-events';
import { INCIDENT_REASONS, type Incident, type IncidentReason, type OrderDetail, type OrderStatus, type Product } from '../../api/types';import { getToken, getUserId } from '../../auth/session';
import { formatAddress, formatBranchAddress } from '../../lib/address';
import { discountCaption } from '../../lib/discount-label';
import { formatDateTime, formatPrice } from '../../lib/money';
import { orderDiscountLabel } from '../../lib/discount-label';
import { orderStatusLabel, showPickupBadge } from '../../lib/order-status';
import { notifyClaimsSeen } from '../../lib/use-open-claims';
import { ConfirmModal } from '../../components/ConfirmModal';
import { LoyaltyStampsCard } from '../../components/LoyaltyStampsCard';
import { mediaUrl } from '../../lib/media';
import { withSaucesLast } from '../../lib/sauces';

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
  const [searchParams] = useSearchParams();
  const fromClaims = searchParams.get('from') === 'claims';
  const backTo = fromClaims ? '/claims' : '/orders';
  const backLabel = fromClaims ? '← Reclamos' : '← Mis pedidos';
  const token = getToken() ?? '';
  const userId = getUserId();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<IncidentReason>('missing_item');
  const [reportMessage, setReportMessage] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState('');
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

  useEffect(() => {
    if (!id || !token || !order?.incident?.responseUnseen) return;
    let cancelled = false;
    void api<Incident>(`/orders/${id}/incident/seen`, { method: 'POST', token })
      .then((incident) => {
        if (!cancelled) setOrder((current) => (current ? { ...current, incident } : current));
        notifyClaimsSeen();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, token, order?.incident?.responseUnseen]);

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
      setConfirmCancel(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'No se pudo cancelar el pedido');
    } finally {
      setCancelling(false);
    }
  }

  async function handleReport(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    const text = reportMessage.trim();
    if (reportReason === 'other' && !text) {
      setReportError('Contanos qué pasó.');
      return;
    }
    setReporting(true);
    setReportError('');
    try {
      const incident = await api<Incident>(`/orders/${id}/incident`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason: reportReason, message: text }),
      });
      setOrder((current) => (current ? { ...current, incident, canReportIncident: false } : current));
      setReportOpen(false);
      setReportMessage('');
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'No se pudo enviar el reclamo');
    } finally {
      setReporting(false);
    }
  }

  if (loading) return <p className="muted">Buscando tu pedido…</p>;

  if (error || !order) {
    return (
      <section className="stack">
        <p className="error" role="alert">
          {error || 'Pedido no encontrado'}
        </p>
        <Link to={backTo}>{fromClaims ? '← Volver a reclamos' : '← Volver a mis pedidos'}</Link>
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
  const promoCaption = discountCaption({
    name: order.promotionName,
    type: order.promotionType,
    value: order.promotionValue,
  });
  const discountLines = order.discounts ?? [];

  return (
    <section className="tracking-page">
      <div className="detail-heading">
        <div className="detail-back-action">
          <Link to={backTo} className="back-link">
            {backLabel}
          </Link>
        </div>

        <header className="tracking-header">
          <div>
            <h1>Seguimiento de pedido</h1>
            <p className="tracking-code">
              Código: <strong className="order-public-code">{order.code ? `#${order.code}` : order.id}</strong>
            </p>
          </div>
          <div className="order-status-marks">
            {order.scheduledFor ? <span className="scheduled-badge">Programado</span> : null}
            {showPickupBadge(order.status, order.fulfillment) ? <span className="pickup-badge">Retiro</span> : null}
            <span className={`tracking-badge tracking-badge--${order.status}`}>
              {orderStatusLabel(order.status, order.fulfillment)}
            </span>
            {order.claimCouponCode ? <span className="badge claim-badge">Cupón de reclamo</span> : null}
            {order.incident ? (
              <span className={order.incident.responseUnseen ? 'badge claim-badge claim-badge--unseen' : 'badge claim-badge'}>
                {order.incident.responseUnseen
                  ? 'Nueva respuesta'
                  : order.incident.status === 'resolved'
                    ? 'Reclamo resuelto'
                    : 'Reclamo enviado'}
              </span>
            ) : null}
          </div>
        </header>
      </div>

      {order.loyalty ? <LoyaltyStampsCard loyalty={order.loyalty} context="checkout" /> : null}

      {/* Bloque 1: Estado, ETA, Demora, Sucursal y Timeline */}
      <div className="tracking-card">
        <div className={order.scheduledFor ? 'delivery-status-banner delivery-status-banner--scheduled' : 'delivery-status-banner'}>
          <div className="eta-block">
            <span className="banner-sublabel">Estado del pedido</span>
            <div className="eta-status-row">
              <strong className={`eta-time tracking-headline tracking-headline--${order.status}`}>
                {orderStatusLabel(order.status, order.fulfillment)}
              </strong>
              {order.scheduledFor ? <span className="scheduled-badge">Programado</span> : null}
            </div>
            {order.status === 'cancelled' ? null : !isTerminal ? (
              isDelayed ? (
                <>
                  <span className="banner-sublabel banner-sublabel--late">Demorado {currentDelayMinutes} min</span>
                  {estimatedTimeFormatted ? (
                    <small className="banner-note">Hora pactada: {estimatedTimeFormatted} hs</small>
                  ) : null}
                  {order.scheduledFor ? (
                    <small className="banner-note banner-note--scheduled">Programado para {formatDateTime(order.scheduledFor)}</small>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="banner-sublabel">
                    {estimatedTimeFormatted
                      ? `Llega aprox. ${estimatedTimeFormatted} hs`
                      : `Aprox. ${remainingMinutes} minutos`}
                  </span>
                  {order.scheduledFor ? (
                    <small className="banner-note banner-note--scheduled">Programado para {formatDateTime(order.scheduledFor)}</small>
                  ) : null}
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
              <span className="branch-meta-address">{formatBranchAddress(order.branch)}</span>
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
                        {orderStatusLabel(h.status, order.fulfillment)}
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
                ? `${order.address.alias?.trim() ? `${order.address.alias.trim()} · ` : ''}${formatAddress(order.address)}`
                : formatBranchAddress(order.branch)}
            </dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{formatDateTime(order.createdAt)}</dd>
          </div>
        </dl>

        <div className="items-list">
          {withSaucesLast(order.items, allProducts).map((item) => {
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

        {order.discountAmount > 0 || order.address ? (
          <div className="total-line">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
        ) : null}
        {discountLines.length > 0
          ? discountLines.map((line) => (
              <div className="total-line" key={`${line.kind}-${line.name}`}>
                <span>{orderDiscountLabel(line, { type: order.promotionType, value: order.promotionValue })}</span>
                <span>−{formatPrice(line.amount)}</span>
              </div>
            ))
          : order.discountAmount > 0 ? (
          <div className="total-line">
            <span>Descuento{promoCaption ? ` (${promoCaption})` : ''}</span>
            <span>−{formatPrice(order.discountAmount)}</span>
          </div>
        ) : null}
        {order.address ? (
          <div className="total-line">
            <span>Envío</span>
            <span>{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Gratis'}</span>
          </div>
        ) : null}
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
            onClick={() => {
              setCancelError('');
              setConfirmCancel(true);
            }}
          >
            Cancelar pedido
          </button>
        </div>
      )}
      {confirmCancel ? (
        <ConfirmModal
          title="Cancelar pedido"
          message="¿Cancelar este pedido? No se puede deshacer."
          confirmLabel="Sí, cancelar"
          dismissLabel="Volver"
          busyLabel="Cancelando…"
          busy={cancelling}
          error={cancelError}
          onConfirm={() => void handleCancel()}
          onClose={() => {
            if (!cancelling) setConfirmCancel(false);
          }}
        />
      ) : null}
      {order.incident ? (
        <div className="tracking-card">
          <h2>Tu reclamo</h2>
          <p>
            <strong>{INCIDENT_REASONS.find((item) => item.value === order.incident?.reason)?.label}</strong>
            {order.incident.status === 'resolved' ? (
              <span className="badge" style={{ marginLeft: '0.5rem' }}>Resuelto</span>
            ) : (
              <span className="badge badge-delay" style={{ marginLeft: '0.5rem' }}>En revisión</span>
            )}
          </p>
          {order.incident.message ? <p className="muted">{order.incident.message}</p> : null}
          <small className="muted">Enviado el {formatDateTime(order.incident.createdAt)}</small>
          {order.incident.status === 'resolved' ? (
            <div className="incident-solution">
              <h3>Solución</h3>
              <p>{order.incident.response || 'Marcado como resuelto.'}</p>
              {order.incident.coupon ? (
                <div className="incident-coupon">
                  <div>
                    <strong>Cupón exclusivo {formatPrice(order.incident.coupon.amount)}</strong>
                    <p className="muted">
                      Código <code>{order.incident.coupon.code}</code>
                      {order.incident.coupon.used
                        ? '. Ya lo usaste.'
                        : order.incident.coupon.status === 'expired'
                          ? '. Venció.'
                          : `. Se descuenta solo en tu cuenta hasta el ${formatDateTime(order.incident.coupon.expiresAt)}.`}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="muted">Lo estamos revisando. Cuando haya una solución, la vas a ver acá.</p>
          )}
        </div>
      ) : order.canReportIncident ? (
        reportOpen ? (
          <form className="card form" onSubmit={(event) => void handleReport(event)} noValidate>
            <h2>Tuve un problema</h2>
            <label>
              ¿Qué pasó?
              <select
                value={reportReason}
                onChange={(event) => {
                  setReportReason(event.target.value as IncidentReason);
                  setReportError('');
                }}
                disabled={reporting}
              >
                {INCIDENT_REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Comentario {reportReason === 'other' ? '' : '(opcional)'}
              <textarea
                value={reportMessage}
                onChange={(event) => setReportMessage(event.target.value)}
                maxLength={500}
                rows={3}
                disabled={reporting}
                placeholder="Contanos un poco más"
              />
            </label>
            {reportError ? (
              <p className="error" role="alert">
                {reportError}
              </p>
            ) : null}
            <div className="row">
              <button type="submit" disabled={reporting}>
                {reporting ? 'Enviando…' : 'Enviar reclamo'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={reporting}
                onClick={() => {
                  setReportOpen(false);
                  setReportError('');
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="cancel-wrapper">
            <button type="button" className="secondary" onClick={() => setReportOpen(true)}>
              Tuve un problema
            </button>
          </div>
        )
      ) : null}
    </section>
  );
}