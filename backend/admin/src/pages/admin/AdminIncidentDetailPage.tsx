import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import {
  INCIDENT_COUPON_STATUS_LABEL,
  INCIDENT_REASON_LABEL,
  type AdminIncident,
  type AdminOrderDetail,
} from '../../api/types';
import { getToken } from '../../auth/session';
import { OrderCode } from '../../components/OrderCode';
import { mediaUrl } from '../../lib/media';
import { useSuccessNotice, useTimedNotice } from '../../lib/success-notice';

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
}

export function AdminIncidentDetailPage() {
  const { id = '' } = useParams();
  const token = getToken() ?? '';
  const [incident, setIncident] = useState<AdminIncident | null>(null);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [response, setResponse] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useTimedNotice();
  const [ok, setOk] = useSuccessNotice();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError('');
    try {
      const next = await api<AdminIncident>(`/admin/incidents/${id}`, { token });
      const paid = await api<AdminOrderDetail>(`/admin/orders/${next.orderId}`, { token });
      setIncident(next);
      setOrder(paid);
      setResponse(next.response ?? '');
      setAmount(next.coupon && !next.coupon.used ? String(next.coupon.amount) : '');
    } catch (err) {
      setIncident(null);
      setOrder(null);
      setError(err instanceof Error ? err.message : 'No se pudo cargar el reclamo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function resolve(event: FormEvent) {
    event.preventDefault();
    if (!incident) return;
    const text = response.trim();
    if (!text) {
      setError('Escribí la respuesta para el cliente');
      return;
    }

    let couponAmount: number | null = null;
    if (incident.coupon?.used) {
      couponAmount = incident.coupon.amount;
    } else if (amount.trim()) {
      const parsed = Number(amount.trim().replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500000) {
        setError('El cupón tiene que ser un monto entre $1 y $500.000');
        return;
      }
      couponAmount = Math.round(parsed * 100) / 100;
    }

    setSaving(true);
    setError('');
    setOk('');
    try {
      await api(`/admin/incidents/${incident.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: 'resolved', response: text, couponAmount }),
      });
      setOk('Solución enviada. El cliente ya puede verla en el pedido.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solución');
    } finally {
      setSaving(false);
    }
  }

  async function reopen() {
    if (!incident) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      await api(`/admin/incidents/${incident.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: 'open' }),
      });
      setOk('Reclamo reabierto.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reabrir el reclamo');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="muted">Cargando reclamo…</p>;
  }

  if (!incident || !order) {
    return (
      <section className="stack">
        <p className="error" role="alert">
          {error || 'Reclamo no encontrado'}
        </p>
        <Link className="btn-back" to="/admin/incidents">
          ← Volver a reclamos
        </Link>
      </section>
    );
  }

  const couponUsed = Boolean(incident.coupon?.used);

  return (
    <section className="stack">
      <Link className="btn-back" to="/admin/incidents">
        ← Volver a reclamos
      </Link>

      <header className="page-head">
        <div>
          <h1>Reclamo de {incident.customerName}</h1>
          <p className="muted">
            Pedido <OrderCode id={incident.orderId} code={incident.orderCode} to={`/admin/orders/${incident.orderId}`} />
            {' · '}
            {incident.branch.name}
            {' · '}
            {formatWhen(incident.createdAt)}
          </p>
        </div>
        {incident.status === 'open' ? (
          <span className="badge badge-delay">Abierto</span>
        ) : (
          <span className="badge">Resuelto</span>
        )}
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="success" role="status">
          {ok}
        </p>
      ) : null}

      <div className="incident-layout">
        <article className="card incident-case">
          <section className="incident-case-part">
            <h2>Lo que reportó</h2>
            <p>
              <strong>{INCIDENT_REASON_LABEL[incident.reason]}</strong>
            </p>
            <p>{incident.message || 'Sin comentario'}</p>
            <p className="muted">Fecha del reporte: {formatWhen(incident.createdAt)}</p>
            <p className="muted">
              {incident.customerName}
              <br />
              {incident.customerEmail}
            </p>
          </section>

          <section className="incident-case-part">
            <h2>Lo que se cobró</h2>
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
                    <p className="muted">
                      {item.quantity} × {formatPrice(item.unitPrice)}
                    </p>
                    {item.extras.length > 0 ? (
                      <p className="muted">
                        {item.extras.map((extra) => `${extra.name} ${formatPrice(extra.price)}`).join(' · ')}
                      </p>
                    ) : null}
                    {item.notes ? <p className="muted">{item.notes}</p> : null}
                  </div>
                  <div className="order-line-amounts">
                    <strong>{formatPrice(item.subtotal)}</strong>
                  </div>
                </li>
              ))}
            </ul>
            <p>
              Subtotal: <strong>{formatPrice(order.subtotal)}</strong>
            </p>
            {order.discountAmount > 0 ? (
              <p>
                Descuento{order.promotionName ? ` (${order.promotionName})` : ''}:{' '}
                <strong>−{formatPrice(order.discountAmount)}</strong>
              </p>
            ) : null}
            {order.address ? (
              <p>
                Envío: <strong>{order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : 'Gratis'}</strong>
              </p>
            ) : (
              <p>
                Entrega: <strong>Retiro en sucursal</strong>
              </p>
            )}
            <p className="price">Total cobrado: {formatPrice(order.totalAmount)}</p>
          </section>
        </article>

        {incident.status === 'resolved' ? (
          <article className="card order-detail-card incident-solution">
            <h2>Solución enviada</h2>
            <p>{incident.response || 'Marcado como resuelto.'}</p>
            {incident.coupon ? (
              <>
                <p>
                  Cupón <strong>{incident.coupon.code}</strong> · {formatPrice(incident.coupon.amount)} ·{' '}
                  {INCIDENT_COUPON_STATUS_LABEL[incident.coupon.status]}
                </p>
                <p className="muted">
                  Creado el {formatWhen(incident.coupon.createdAt)}. Vence el {formatWhen(incident.coupon.expiresAt)}.
                </p>
              </>
            ) : (
              <p className="muted">Esta solución no incluye cupón.</p>
            )}
            {incident.resolvedAt ? <p className="muted">Resuelto el {formatWhen(incident.resolvedAt)}</p> : null}
            {couponUsed ? (
              <p className="muted">El cliente ya usó el cupón. La respuesta y el monto quedan fijos.</p>
            ) : (
              <>
                <p className="muted">
                  {incident.coupon
                    ? 'Mientras el cliente no use el cupón, podés cambiar la respuesta y el monto.'
                    : 'Podés cambiar la respuesta.'}{' '}
                  Si editás algo, el cliente la vuelve a ver como no leída.
                </p>
                <div className="row">
                  <button type="button" className="secondary" disabled={saving} onClick={() => void reopen()}>
                    {saving ? 'Guardando…' : 'Reabrir'}
                  </button>
                </div>
              </>
            )}
          </article>
        ) : (
          <form className="card form incident-solution" onSubmit={(event) => void resolve(event)} noValidate>
            <h2>Solución</h2>
            <p className="muted">
              El total cobrado fue {formatPrice(order.totalAmount)}. El cupón, si lo cargás, es solo para{' '}
              {incident.customerName}, se descuenta en su próximo pedido y vence a los 3 meses.
            </p>
            <label className="incident-response">
              Respuesta para el cliente
              <textarea
                value={response}
                onChange={(event) => setResponse(event.target.value)}
                maxLength={500}
                rows={4}
                required
                disabled={saving}
                placeholder="Contale cómo lo resolvemos"
              />
            </label>
            <label>
              Monto del cupón (opcional)
              <input
                type="number"
                min={1}
                max={500000}
                step="0.01"
                inputMode="decimal"
                value={couponUsed && incident.coupon ? String(incident.coupon.amount) : amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={saving || couponUsed}
                placeholder="Sin cupón"
              />
            </label>
            {couponUsed && incident.coupon ? (
              <p className="muted">El cupón {incident.coupon.code} ya se usó. El monto queda fijo.</p>
            ) : (
              <div className="row">
                <button
                  type="button"
                  className="secondary"
                  disabled={saving || order.totalAmount < 1}
                  onClick={() => setAmount(String(Math.round(order.totalAmount * 100) / 100))}
                >
                  Usar el total cobrado
                </button>
              </div>
            )}
            <div className="row">
              <button type="submit" disabled={saving}>
                {saving ? 'Enviando…' : 'Enviar solución'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
