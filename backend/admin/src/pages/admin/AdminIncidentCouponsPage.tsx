import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import {
  INCIDENT_COUPON_STATUS_LABEL,
  type AdminIncidentCoupon,
} from '../../api/types';
import { getToken } from '../../auth/session';
import { OrderCode } from '../../components/OrderCode';
import { useTimedNotice } from '../../lib/success-notice';

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
}

export function AdminIncidentCouponsPage() {
  const token = getToken() ?? '';
  const [coupons, setCoupons] = useState<AdminIncidentCoupon[]>([]);
  const [error, setError] = useTimedNotice();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api<AdminIncidentCoupon[]>('/admin/incidents/coupons', { token })
      .then((rows) => {
        if (active) setCoupons(rows);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar los cupones');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, setError]);

  return (
    <section className="stack">
      <Link className="btn-back" to="/admin/incidents">
        ← Volver a reclamos
      </Link>
      <header className="page-head">
        <div>
          <h1>Cupones de reclamos</h1>
          <p className="muted">
            Cupones generados al resolver un reclamo. Cada uno vence a los 3 meses de haberse creado.
            {coupons.length > 0 ? ` ${coupons.length} en total.` : ''}
          </p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="muted">Cargando cupones…</p> : null}
      {!loading && coupons.length === 0 && !error ? <p className="empty">Todavía no hay cupones de reclamos.</p> : null}

      {!loading && coupons.length > 0 ? (
        <>
          <div className="table-wrap mobile-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cupón</th>
                  <th>Estado</th>
                  <th>Fecha del reclamo</th>
                  <th>Creación del cupón</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <OrderCode id={coupon.orderId} code={coupon.orderCode} to={`/admin/incidents/${coupon.id}`} />
                      <p className="table-slug muted">{coupon.customerName}</p>
                    </td>
                    <td>
                      <strong>{coupon.code}</strong>
                      <p className="table-slug muted">{formatPrice(coupon.amount)}</p>
                    </td>
                    <td>
                      <span className={coupon.status === 'available' ? 'badge' : 'badge badge-delay'}>
                        {INCIDENT_COUPON_STATUS_LABEL[coupon.status]}
                      </span>
                      <p className="table-slug muted">Vence {formatWhen(coupon.expiresAt)}</p>
                    </td>
                    <td className="muted cell-nowrap">{formatWhen(coupon.reportedAt)}</td>
                    <td className="muted cell-nowrap">{formatWhen(coupon.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mobile-card-list">
            {coupons.map((coupon) => (
              <li key={coupon.id} className="order-card">
                <div className="order-card-top">
                  <OrderCode id={coupon.orderId} code={coupon.orderCode} to={`/admin/incidents/${coupon.id}`} />
                  <span className={coupon.status === 'available' ? 'badge' : 'badge badge-delay'}>
                    {INCIDENT_COUPON_STATUS_LABEL[coupon.status]}
                  </span>
                </div>
                <p>
                  <strong>{coupon.code}</strong> · {formatPrice(coupon.amount)}
                </p>
                <p className="muted">{coupon.customerName}</p>
                <p className="muted">Reclamo: {formatWhen(coupon.reportedAt)}</p>
                <p className="muted">Cupón creado: {formatWhen(coupon.createdAt)}</p>
                <p className="muted">Vence: {formatWhen(coupon.expiresAt)}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
