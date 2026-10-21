import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { AdminAccount } from '../../api/types';
import { getToken, getUser } from '../../auth/session';
import { useSuccessNotice, useTimedNotice } from '../../lib/success-notice';

const PAGE_SIZE = 20;
const INITIAL_ADMIN_EMAIL = 'admin@rapido.local';

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function isInitialAdmin(admin: { email: string; deletable?: boolean }) {
  return admin.deletable === false || admin.email.toLowerCase() === INITIAL_ADMIN_EMAIL;
}

export function AdminAdminsPage() {
  const token = getToken() ?? '';
  const navigate = useNavigate();
  const location = useLocation();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useTimedNotice();
  const [ok, setOk] = useSuccessNotice();
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<AdminAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const currentUserId = getUser()?.id ?? '';

  async function load() {
    setLoading(true);
    setError('');
    try {
      setAdmins(await api<AdminAccount[]>('/admin/admins', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los administradores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (!pendingDelete) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) setPendingDelete(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingDelete, deleting]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return admins;
    return admins.filter(
      (admin) => admin.name.toLowerCase().includes(needle) || admin.email.toLowerCase().includes(needle),
    );
  }, [admins, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = visible.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, visible.length);

  useEffect(() => {
    const notice = (location.state as { notice?: string } | null)?.notice;
    if (notice) setOk(notice);
  }, [location.state, setOk]);

  function deleteBlockReason(admin: AdminAccount) {
    if (isInitialAdmin(admin)) return 'El administrador inicial no se puede borrar';
    if (admin.id === currentUserId) return 'No podés borrar tu propio usuario';
    return '';
  }

  function askRemove(admin: AdminAccount) {
    if (deleteBlockReason(admin)) return;
    setError('');
    setPendingDelete(admin);
  }

  async function confirmRemove() {
    if (!pendingDelete || deleting) return;
    const admin = pendingDelete;
    setDeleting(true);
    setError('');
    setOk('');
    try {
      await api(`/admin/admins/${admin.id}`, { method: 'DELETE', token });
      setPendingDelete(null);
      setOk(`Se borró “${admin.name}”.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Administradores</h1>
          <p className="muted">
            {admins.length} con acceso al backoffice. {INITIAL_ADMIN_EMAIL} es el administrador inicial y no se puede
            borrar.
          </p>
        </div>
        <button type="button" disabled={loading} onClick={() => navigate('/admin/admins/nueva')}>
          Crear administrador
        </button>
      </header>

      {error && !pendingDelete ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="success" role="status">
          {ok}
        </p>
      ) : null}

      <div className="admin-toolbar">
        <label className="search-label">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o email"
            type="search"
          />
        </label>
      </div>

      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="empty">
          {admins.length === 0 ? 'Todavía no hay administradores.' : 'Ningún administrador coincide con la búsqueda.'}
        </p>
      ) : null}

      {!loading && pageItems.length > 0 ? (
        <>
        <div className="table-wrap mobile-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Desde</th>
                <th className="data-table-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((admin) => {
                const initial = isInitialAdmin(admin);
                const blocked = deleteBlockReason(admin);
                const self = admin.id === currentUserId;
                return (
                  <tr key={admin.id}>
                    <td>
                      <strong>{admin.name}</strong>
                      {initial || self ? (
                        <p className="table-slug admin-marks">
                          {initial ? <span className="badge">Inicial</span> : null}
                          {self ? <span className="badge">Vos</span> : null}
                        </p>
                      ) : null}
                    </td>
                    <td>{admin.email}</td>
                    <td className="muted">{formatWhen(admin.createdAt)}</td>
                    <td className="data-table-actions">
                      <div className="row">
                        <button type="button" className="secondary" onClick={() => navigate(`/admin/admins/${admin.id}`)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => askRemove(admin)}
                          disabled={Boolean(blocked)}
                          title={blocked || 'Borrar'}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="mobile-card-list">
          {pageItems.map((admin) => {
            const initial = isInitialAdmin(admin);
            const blocked = deleteBlockReason(admin);
            const self = admin.id === currentUserId;
            return (
              <li key={admin.id} className="order-card">
                <div className="order-card-top">
                  <strong>{admin.name}</strong>
                  <span className="row">
                    {initial ? <span className="badge">Inicial</span> : null}
                    {self ? <span className="badge">Vos</span> : null}
                  </span>
                </div>
                <p>{admin.email}</p>
                <p className="muted">Desde {formatWhen(admin.createdAt)}</p>
                <div className="row">
                  <button type="button" className="secondary" onClick={() => navigate(`/admin/admins/${admin.id}`)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => askRemove(admin)}
                    disabled={Boolean(blocked)}
                    title={blocked || 'Borrar'}
                  >
                    Borrar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        </>
      ) : null}

      {!loading && pageCount > 1 ? (
        <nav className="pagination" aria-label="Paginación de administradores">
          <button
            type="button"
            className="secondary"
            disabled={currentPage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Anterior
          </button>
          <p className="pagination-status">
            {from}–{to} de {visible.length} · Página {currentPage} de {pageCount}
          </p>
          <button
            type="button"
            className="secondary"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
            Siguiente
          </button>
        </nav>
      ) : null}

      {pendingDelete ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!deleting) setPendingDelete(null);
          }}
        >
          <div
            className="card modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-admin-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-admin-title">Borrar administrador</h2>
            <p>
              ¿Estás seguro de borrar al administrador {pendingDelete.name} ({pendingDelete.email})? Esta acción no se
              puede deshacer.
            </p>
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="row modal-actions">
              <button type="button" className="danger" disabled={deleting} onClick={() => void confirmRemove()}>
                {deleting ? 'Borrando…' : 'Borrar'}
              </button>
              <button type="button" className="secondary" disabled={deleting} autoFocus onClick={() => setPendingDelete(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
