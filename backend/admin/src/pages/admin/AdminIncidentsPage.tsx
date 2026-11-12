import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { INCIDENT_REASON_LABEL, type AdminIncident } from '../../api/types';
import { getToken } from '../../auth/session';
import { OrderCode } from '../../components/OrderCode';
import { useTimedNotice } from '../../lib/success-notice';

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export function AdminIncidentsPage() {
  const token = getToken() ?? '';
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [error, setError] = useTimedNotice();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api<AdminIncident[]>('/admin/incidents', { token })
      .then((rows) => {
        if (active) setIncidents(rows);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar los reclamos');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, setError]);

  const openCount = incidents.filter((incident) => incident.status === 'open').length;

  function StatusBadge({ incident }: { incident: AdminIncident }) {
    return incident.status === 'open' ? (
      <span className="badge badge-delay">Abierto</span>
    ) : (
      <span className="badge">Resuelto</span>
    );
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Reclamos</h1>
          <p className="muted">
            Problemas que reportaron los clientes sobre pedidos entregados. Abrí el reclamo para ver lo que se cobró y
            responder.{' '}
            {incidents.length > 0 ? `${openCount} abiertos de ${incidents.length}.` : ''}
          </p>
          <div className="row">
            <Link className="button" to="/admin/incident-coupons">
              Cupones de reclamos
            </Link>
          </div>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p className="muted">Cargando reclamos…</p> : null}
      {!loading && incidents.length === 0 && !error ? <p className="empty">Todavía no hay reclamos.</p> : null}

      {!loading && incidents.length > 0 ? (
        <>
          <div className="table-wrap mobile-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th className="data-table-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td>
                      <OrderCode id={incident.orderId} code={incident.orderCode} to={`/admin/orders/${incident.orderId}`} />
                      <p className="table-slug muted">{incident.branch.name}</p>
                    </td>
                    <td>
                      <strong>{incident.customerName}</strong>
                      <p className="table-slug muted table-email" title={incident.customerEmail}>
                        {incident.customerEmail}
                      </p>
                    </td>
                    <td>
                      <strong>{INCIDENT_REASON_LABEL[incident.reason]}</strong>
                      <p className="table-slug muted">{incident.message || 'Sin comentario'}</p>
                    </td>
                    <td>
                      <StatusBadge incident={incident} />
                    </td>
                    <td className="muted cell-nowrap">{formatWhen(incident.createdAt)}</td>
                    <td className="data-table-actions">
                      <Link className="button" to={`/admin/incidents/${incident.id}`}>
                        {incident.status === 'open' ? 'Responder' : 'Ver'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mobile-card-list">
            {incidents.map((incident) => (
              <li key={incident.id} className="order-card">
                <div className="order-card-top">
                  <OrderCode id={incident.orderId} code={incident.orderCode} to={`/admin/orders/${incident.orderId}`} />
                  <StatusBadge incident={incident} />
                </div>
                <p>
                  <strong>{INCIDENT_REASON_LABEL[incident.reason]}</strong>
                </p>
                <p className="muted">{incident.message || 'Sin comentario'}</p>
                <p className="muted">
                  {incident.customerName} · {incident.branch.name} · {formatWhen(incident.createdAt)}
                </p>
                <div className="row">
                  <Link className="button" to={`/admin/incidents/${incident.id}`}>
                    {incident.status === 'open' ? 'Responder' : 'Ver'}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
