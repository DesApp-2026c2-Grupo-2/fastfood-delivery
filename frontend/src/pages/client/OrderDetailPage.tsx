import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { OrderDetail, Product } from '../../api/types';
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
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const [orderData, productsData] = await Promise.all([
          api<OrderDetail>(`/orders/${id}`, { token }),
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

  const isTerminal = order.status === 'delivered' || order.status === 'cancelled';
  const showCancel =
    order.canCancel ?? (order.status === 'pending' || order.status === 'confirmed');

  const reversedHistory = order.history ? [...order.history].reverse() : [];

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

      {/* Bloque 1: Estado, ETA, Sucursal y Timeline */}
      <div className="tracking-card">
        <div className="delivery-status-banner">
          {!isTerminal && order.etaMinutes !== undefined && order.etaMinutes !== null ? (
            <div className="eta-block">
              <span className="banner-sublabel">Tiempo estimado de entrega</span>
              <strong className="eta-time">Aprox. {order.etaMinutes} minutos</strong>
            </div>
          ) : (
            <div />
          )}

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
        <h2>Detalle de la compra</h2>

        <div className="delivery-info">
          <p>
            <strong>Entrega en:</strong>{' '}
            {order.address.alias?.trim() ? `${order.address.alias.trim()} · ` : ''}
            {order.address.street}
          </p>
          <p className="order-date">Fecha de creación: {formatDateTime(order.createdAt)}</p>
        </div>

        <div className="items-list">
          {order.items.map((item, itemIdx) => {
            const isLast = itemIdx === order.items.length - 1;
            const hasExtras = Array.isArray(item.extras) && item.extras.length > 0;

            // Separar la nota real de prefijos viejos de extras
            let userNote = item.notes?.trim() || '';
            if (userNote.toLowerCase().startsWith('extras:') || userNote.toLowerCase().startsWith('con:')) {
              userNote = '';
            }

            return (
              <div
                key={item.id}
                className="item-entry"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0.75rem 0',
                  borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                }}
              >
                {/* Renglón principal */}
                <div
                  className="item-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: 'none',
                  }}
                >
                  <div className="item-main" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="item-thumb"
                        style={{
                          width: '44px',
                          height: '44px',
                          objectFit: 'contain',
                          background: '#fff7ed',
                          border: '1px solid #fed7aa',
                          borderRadius: '10px',
                          padding: '3px',
                          flexShrink: 0,
                        }}
                      />
                    ) : null}
                    <span className="item-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {item.product.name}
                    </span>
                  </div>
                  <div className="item-amounts">
                    <span className="item-qty">{item.quantity}×</span>
                    <strong className="item-subtotal">{formatPrice(item.subtotal)}</strong>
                  </div>
                </div>

                {/* DEV-17: Adicionales con miniatura e importe limpio */}
                {hasExtras && (
                  <div
                    className="item-extras-list"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      marginTop: '0.45rem',
                      paddingLeft: '3.6rem',
                    }}
                  >
                    {item.extras!.map((extra, idx) => {
                      const matchedProduct = allProducts.find(
                        (p) =>
                          p.id === extra.id ||
                          p.name.toLowerCase().trim() === extra.name.toLowerCase().trim()
                      );
                      const finalImage = extra.imageUrl || matchedProduct?.imageUrl;
                      const extraPrice = extra.price || matchedProduct?.price;

                      return (
                        <div
                          key={extra.id ?? idx}
                          className="item-extra-subrow"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem',
                          }}
                        >
                          <span style={{ color: '#fdba74', fontWeight: 700, userSelect: 'none' }}>
                            └
                          </span>
                          {finalImage ? (
                            <img
                              src={finalImage}
                              alt={extra.name}
                              style={{
                                width: '26px',
                                height: '26px',
                                objectFit: 'contain',
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                borderRadius: '6px',
                                padding: '2px',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                width: '26px',
                                height: '26px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                              }}
                            >
                              ✨
                            </span>
                          )}
                          <span style={{ fontWeight: 500, color: '#334155' }}>
                            {extra.name}
                          </span>
                          {extraPrice ? (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 400 }}>
                              (+{formatPrice(extraPrice)})
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Observación real del cliente */}
                {userNote && (
                  <div
                    className="item-notes-callout"
                    style={{
                      marginTop: '0.45rem',
                      paddingLeft: '3.6rem',
                      fontSize: '0.82rem',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>✏️</span>
                    <span style={{ fontStyle: 'italic' }}>Observación: "{userNote}"</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="total-divider" />

        <div className="total-line">
          <span>Importe total</span>
          <span className="total-amount">{formatPrice(order.totalAmount)}</span>
        </div>
      </div>

      {/* Acciones */}
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