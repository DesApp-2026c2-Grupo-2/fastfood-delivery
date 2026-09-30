import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Branch, StockLine } from '../../api/types';
import { getToken } from '../../auth/session';
import { mediaUrl } from '../../lib/media';

const MAX_AVAILABLE = 1_000_000;

function parseAvailable(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0 || value > MAX_AVAILABLE) return null;
  return value;
}

export function AdminStockPage() {
  const token = getToken() ?? '';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [lines, setLines] = useState<StockLine[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadBranches() {
      setLoadingBranches(true);
      setError('');
      try {
        const list = await api<Branch[]>('/admin/branches', { token });
        if (cancelled) return;
        setBranches(list);
        setBranchId((current) => current || list[0]?.id || '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar las sucursales');
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    }
    void loadBranches();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!branchId) {
      setLines([]);
      setDrafts({});
      return;
    }
    let cancelled = false;
    async function loadStock() {
      setLoadingStock(true);
      setError('');
      setSavedId('');
      setRowError({});
      try {
        const list = await api<StockLine[]>(`/admin/branches/${branchId}/stock`, { token });
        if (cancelled) return;
        setLines(list);
        setDrafts(Object.fromEntries(list.map((line) => [line.productId, String(line.available)])));
      } catch (err) {
        if (!cancelled) {
          setLines([]);
          setError(err instanceof Error ? err.message : 'No se pudo cargar el stock');
        }
      } finally {
        if (!cancelled) setLoadingStock(false);
      }
    }
    void loadStock();
    return () => {
      cancelled = true;
    };
  }, [branchId, token]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return lines;
    return lines.filter(
      (line) =>
        line.productName.toLowerCase().includes(needle) ||
        line.categories.some((category) => category.name.toLowerCase().includes(needle)),
    );
  }, [lines, query]);

  async function save(line: StockLine) {
    const raw = drafts[line.productId] ?? '';
    const available = parseAvailable(raw);
    if (available == null) {
      setRowError((current) => ({
        ...current,
        [line.productId]: `La cantidad tiene que ser un entero entre 0 y ${MAX_AVAILABLE.toLocaleString('es-AR')}.`,
      }));
      return;
    }
    if (available === line.available) return;

    setSavingId(line.productId);
    setSavedId('');
    setRowError((current) => ({ ...current, [line.productId]: '' }));
    setError('');
    try {
      const updated = await api<StockLine>(`/admin/branches/${branchId}/stock/${line.productId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ available }),
      });
      setLines((current) => current.map((item) => (item.productId === updated.productId ? updated : item)));
      setDrafts((current) => ({ ...current, [updated.productId]: String(updated.available) }));
      setSavedId(updated.productId);
    } catch (err) {
      setRowError((current) => ({
        ...current,
        [line.productId]: err instanceof Error ? err.message : 'No se pudo guardar el stock',
      }));
    } finally {
      setSavingId('');
    }
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Stock</h1>
          <p className="muted">Cantidad disponible de cada producto, por sucursal. Lo reservado no se edita.</p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-toolbar stock-toolbar">
        <label className="search-label">
          Sucursal
          <select
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            disabled={loadingBranches || branches.length === 0}
          >
            {branches.length === 0 ? <option value="">Sin sucursales</option> : null}
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
                {branch.active ? '' : ' (inactiva)'}
              </option>
            ))}
          </select>
        </label>
        <label className="search-label">
          Producto
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o categoría"
            type="search"
            autoComplete="off"
          />
        </label>
      </div>

      {loadingBranches || loadingStock ? <p className="muted">Cargando stock…</p> : null}

      {!loadingStock && branchId && visible.length === 0 && !error ? (
        <p className="empty">{lines.length === 0 ? 'No hay productos para cargar stock.' : 'Ningún producto coincide.'}</p>
      ) : null}

      {!loadingStock && visible.length > 0 ? (
        <ul className="list stock-list">
          {visible.map((line) => {
            const draft = drafts[line.productId] ?? String(line.available);
            const dirty = parseAvailable(draft) !== line.available;
            const message = rowError[line.productId];
            return (
              <li key={line.productId} className="card stock-row">
                {line.imageUrl ? (
                  <img className="list-thumb" src={mediaUrl(line.imageUrl)} alt="" />
                ) : (
                  <span className="list-thumb" />
                )}
                <div className="stock-row-body">
                  <strong>{line.productName}</strong>
                  <p className="muted">
                    {line.categories.map((category) => category.name).join(' · ') || 'Sin categoría'}
                    {line.productAvailable ? '' : ' · oculto en el menú'}
                  </p>
                  <p className="muted">
                    Reservado: <strong>{line.reserved}</strong>
                    {line.updatedAt == null ? ' · todavía sin fila de stock' : ''}
                  </p>
                  <label className="stock-available">
                    Disponible
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_AVAILABLE}
                      step={1}
                      value={draft}
                      onChange={(event) => {
                        setDrafts((current) => ({ ...current, [line.productId]: event.target.value }));
                        setSavedId('');
                      }}
                    />
                  </label>
                  {message ? (
                    <p className="error" role="alert">
                      {message}
                    </p>
                  ) : null}
                  {savedId === line.productId ? <p className="success">Stock guardado.</p> : null}
                </div>
                <button type="button" disabled={!dirty || savingId === line.productId} onClick={() => void save(line)}>
                  {savingId === line.productId ? 'Guardando…' : 'Guardar'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
