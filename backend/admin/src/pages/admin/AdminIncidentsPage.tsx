import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { INCIDENT_REASON_LABEL, type AdminIncident, type IncidentStatus } from '../../api/types';
import { getToken } from '../../auth/session';
import { OrderCode } from '../../components/OrderCode';
import { useSuccessNotice, useTimedNotice } from '../../lib/success-notice';

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export function AdminIncidentsPage() {
  const token = getToken() ?? '';
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [error, setError] = useTimedNotice();
  const [ok, setOk] = useSuccessNotice();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      setIncidents(await api<AdminIncident[]>('/admin/incidents', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los reclamos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(incident: AdminIncident, status: IncidentStatus) {
    setUpdatingId(incident.id);
    setError('');
    setOk('');
    try {
      await api(`/admin/incidents/${incident.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      });
      setOk(status === 'resolved' ? 'Reclamo marcado como resuelto.' : 'Reclamo reabierto.');
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el reclamo');
    } finally {
      setUpdatingId('');
    }
  }

  const openCount = incidents.filter((incident) => incident.status === 'open').length;

  function StatusBadge({ incident }: { incident: AdminIncident }) {
    return incident.status === 'open' ? (
      <span className="badge badge-delay">Abierto</span>
    ) : (
      <span className="badge">Resuelto</span>
    );
  }

  function Action({ incident }: { incident: AdminIncident }) {
    const busy = updatingId === incident.id;
    return incident.status === 'open' ? (
      <button type="button" disabled={busy} onClick={() => void setStatus(incident, 'resolved')}>
        {busy ? 'Guardando…' : 'Marcar resuelto'}
      </button>
    ) : (
      <button type="button" className="secondary" disabled={busy} onClick={() => void setStatus(incident, 'open')}>
        {busy ? 'Guardando…' : 'Reabrir'}
      </button>
    );
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Reclamos</h1>
          <p className="muted">
            Problemas que reportaron los clientes sobre pedidos entregados.{' '}
            {incidents.length > 0 ? `${openCount} abiertos de ${incidents.length}.` : ''}
          </p>
        </div>
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
                      {incident.resolvedAt ? (
                        <p className="table-slug muted">{formatWhen(incident.resolvedAt)}</p>
                      ) : null}
                    </td>
                    <td className="muted">{formatWhen(incident.createdAt)}</td>
                    <td className="data-table-actions">
                      <Action incident={incident} />
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
                  <Action incident={incident} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}