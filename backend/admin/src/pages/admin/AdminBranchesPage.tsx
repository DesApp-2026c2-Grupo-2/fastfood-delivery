import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Branch } from '../../api/types';
import { getToken } from '../../auth/session';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useSuccessNotice, useTimedNotice } from '../../lib/success-notice';

const PAGE_SIZE = 20;

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

export function AdminBranchesPage() {
  const token = getToken() ?? '';
  const navigate = useNavigate();
  const location = useLocation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useTimedNotice();
  const [ok, setOk] = useSuccessNotice();
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setBranches(await api<Branch[]>('/admin/branches', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las sucursales');
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

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return branches;
    return branches.filter(
      (branch) =>
        branch.name.toLowerCase().includes(needle) ||
        branch.address.toLowerCase().includes(needle) ||
        branch.phone.toLowerCase().includes(needle),
    );
  }, [branches, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = visible.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, visible.length);

  useEffect(() => {
    const notice = (location.state as { notice?: string } | null)?.notice;
    if (notice) setOk(notice);
  }, [location.state, setOk]);

  async function remove(branch: Branch) {
    setDeleting(true);
    setError('');
    setOk('');
    try {
      await api(`/admin/branches/${branch.id}`, { method: 'DELETE', token });
      setOk(`Se borró “${branch.name}”.`);
      setPendingDelete(null);
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
          <h1>Sucursales</h1>
          <p className="muted">{branches.length} locales cargados. Las inactivas no se asignan a pedidos nuevos.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => navigate('/admin/branches/nueva')}>
          Crear sucursal
        </button>
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

      <div className="admin-toolbar">
        <label className="search-label">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por nombre, dirección o teléfono"
            type="search"
          />
        </label>
      </div>

      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="empty">
          {branches.length === 0
            ? 'Todavía no hay sucursales. Creá la primera para poder asignar pedidos.'
            : 'Ninguna sucursal coincide con la búsqueda.'}
        </p>
      ) : null}

      {!loading && pageItems.length > 0 ? (
        <>
        <div className="table-wrap mobile-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th className="data-table-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((branch) => (
                <tr key={branch.id}>
                  <td>
                    <strong>{branch.name}</strong>
                    <br />
                    <span className="muted">{branch.phone}</span>
                  </td>
                  <td>
                    {branch.address}
                    <br />
                    <span className="muted">
                      {toNumber(branch.latitude).toFixed(4)}, {toNumber(branch.longitude).toFixed(4)}
                    </span>
                  </td>
                  <td>{branch.active ? 'Activa' : 'Inactiva'}</td>
                  <td className="data-table-actions">
                    <div className="row">
                      <button type="button" className="secondary" onClick={() => navigate(`/admin/branches/${branch.id}`)}>
                        Editar
                      </button>
                      <button type="button" className="danger" onClick={() => setPendingDelete(branch)}>
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mobile-card-list">
          {pageItems.map((branch) => (
            <li key={branch.id} className="order-card">
              <div className="order-card-top">
                <strong>{branch.name}</strong>
                <span className={branch.active ? 'badge' : 'badge badge--off'}>
                  {branch.active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <p className="muted">{branch.phone}</p>
              <p>{branch.address}</p>
              <p className="muted">
                {toNumber(branch.latitude).toFixed(4)}, {toNumber(branch.longitude).toFixed(4)}
              </p>
              <div className="row">
                <button type="button" className="secondary" onClick={() => navigate(`/admin/branches/${branch.id}`)}>
                  Editar
                </button>
                <button type="button" className="danger" onClick={() => setPendingDelete(branch)}>
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
        </>
      ) : null}

      {!loading && pageCount > 1 ? (
        <nav className="pagination" aria-label="Paginación de sucursales">
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
        <ConfirmModal
          title="Borrar sucursal"
          message={`¿Borrar “${pendingDelete.name}”? No se puede deshacer.`}
          confirmLabel="Borrar"
          busyLabel="Borrando…"
          busy={deleting}
          error={error}
          onConfirm={() => void remove(pendingDelete)}
          onClose={() => {
            if (!deleting) setPendingDelete(null);
          }}
        />
      ) : null}
    </section>
  );
}
