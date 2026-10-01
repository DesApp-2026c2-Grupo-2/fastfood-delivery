import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import type { Branch, StockLine } from '../../api/types';
import { getToken } from '../../auth/session';
import { mediaUrl } from '../../lib/media';

const MAX_AVAILABLE = 1_000_000;

type BulkMode = 'add' | 'sub' | 'zero';

function parseAvailable(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0 || value > MAX_AVAILABLE) return null;
  return value;
}

function nextAvailable(current: number, mode: BulkMode, delta: number) {
  if (mode === 'zero') return 0;
  if (mode === 'add') return Math.min(MAX_AVAILABLE, current + delta);
  return Math.max(0, current - delta);
}

export function AdminStockPage() {
  const token = getToken() ?? '';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [lines, setLines] = useState<StockLine[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkQty, setBulkQty] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

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
      setSelected(new Set());
      return;
    }
    let cancelled = false;
    async function loadStock() {
      setLoadingStock(true);
      setError('');
      setNote('');
      setSavedId('');
      setRowError({});
      setSelected(new Set());
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

  const selectedVisible = visible.filter((line) => selected.has(line.productId)).length;
  const allVisibleSelected = visible.length > 0 && selectedVisible === visible.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedVisible > 0 && !allVisibleSelected;
    }
  }, [selectedVisible, allVisibleSelected]);

  function toggle(productId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const line of visible) next.delete(line.productId);
      } else {
        for (const line of visible) next.add(line.productId);
      }
      return next;
    });
  }

  async function putAvailable(line: StockLine, available: number) {
    return api<StockLine>(`/admin/branches/${branchId}/stock/${line.productId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ available }),
    });
  }

  function remember(updated: StockLine) {
    setLines((current) => current.map((item) => (item.productId === updated.productId ? updated : item)));
    setDrafts((current) => ({ ...current, [updated.productId]: String(updated.available) }));
  }

  async function save(line: StockLine) {
    const raw = drafts[line.productId] ?? '';
    const available = parseAvailable(raw);
    if (available == null) {
      setRowError((current) => ({
        ...current,
        [line.productId]: `Entero entre 0 y ${MAX_AVAILABLE.toLocaleString('es-AR')}.`,
      }));
      return;
    }
    if (available === line.available) return;

    setSavingId(line.productId);
    setSavedId('');
    setNote('');
    setRowError((current) => ({ ...current, [line.productId]: '' }));
    setError('');
    try {
      remember(await putAvailable(line, available));
      setSavedId(line.productId);
    } catch (err) {
      setRowError((current) => ({
        ...current,
        [line.productId]: err instanceof Error ? err.message : 'No se pudo guardar el stock',
      }));
    } finally {
      setSavingId('');
    }
  }

  async function applyBulk(mode: BulkMode) {
    const targets = lines.filter((line) => selected.has(line.productId));
    if (!targets.length || bulkSaving) return;

    let delta = 0;
    if (mode !== 'zero') {
      const parsed = parseAvailable(bulkQty);
      if (parsed == null || parsed < 1) {
        setNote('');
        setError('Para sumar o quitar, indicá una cantidad entera mayor a 0.');
        return;
      }
      delta = parsed;
    } else if (!confirm(`¿Dejar en 0 el disponible de ${targets.length} producto${targets.length === 1 ? '' : 's'}?`)) {
      return;
    }

    const updates = targets
      .map((line) => ({ line, available: nextAvailable(line.available, mode, delta) }))
      .filter((item) => item.available !== item.line.available);

    setError('');
    setNote('');
    setSavedId('');
    if (!updates.length) {
      setNote('Esos productos ya tenían esa cantidad.');
      return;
    }

    setBulkSaving(true);
    const settled = await Promise.allSettled(updates.map((item) => putAvailable(item.line, item.available)));
    let ok = 0;
    let failed = 0;
    settled.forEach((result, index) => {
      const productId = updates[index].line.productId;
      if (result.status === 'fulfilled') {
        ok += 1;
        remember(result.value);
        setRowError((current) => ({ ...current, [productId]: '' }));
      } else {
        failed += 1;
        const reason = result.reason;
        setRowError((current) => ({
          ...current,
          [productId]: reason instanceof Error ? reason.message : 'No se pudo guardar',
        }));
      }
    });
    setBulkSaving(false);
    if (failed === 0) {
      setNote(ok === 1 ? 'Se actualizó 1 producto.' : `Se actualizaron ${ok} productos.`);
    } else {
      setError(`Se actualizaron ${ok}. No se pudo guardar ${failed}.`);
    }
  }

  const selectedCount = lines.filter((line) => selected.has(line.productId)).length;
  const busy = bulkSaving || savingId !== '';

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Stock</h1>
          <p className="muted">Disponible por sucursal. Lo reservado no se edita.</p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="success" role="status">
          {note}
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
        <div className="stock-sheet">
          <div className="stock-bulk">
            <p className="stock-bulk-count">
              {selectedCount === 0 ? 'Nada seleccionado' : `${selectedCount} seleccionado${selectedCount === 1 ? '' : 's'}`}
            </p>
            <label className="stock-bulk-qty">
              Cantidad
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_AVAILABLE}
                step={1}
                value={bulkQty}
                onChange={(event) => setBulkQty(event.target.value)}
                disabled={busy}
              />
            </label>
            <div className="row">
              <button type="button" className="secondary" disabled={busy || selectedCount === 0} onClick={() => void applyBulk('add')}>
                {bulkSaving ? 'Aplicando…' : 'Sumar'}
              </button>
              <button type="button" className="secondary" disabled={busy || selectedCount === 0} onClick={() => void applyBulk('sub')}>
                Quitar
              </button>
              <button type="button" className="danger" disabled={busy || selectedCount === 0} onClick={() => void applyBulk('zero')}>
                Poner en 0
              </button>
            </div>
          </div>

          <div className="stock-line stock-line--head">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleVisible}
              aria-label="Seleccionar los productos visibles"
              disabled={busy}
            />
            <span />
            <span>Producto</span>
            <span>Disponible</span>
          </div>

          <ul className="stock-lines">
            {visible.map((line) => {
              const draft = drafts[line.productId] ?? String(line.available);
              const dirty = parseAvailable(draft) !== line.available;
              const message = rowError[line.productId];
              const meta = [
                line.categories.map((category) => category.name).join(' · ') || 'Sin categoría',
                `reservado ${line.reserved}`,
                line.productAvailable ? '' : 'oculto',
                line.updatedAt == null ? 'sin fila' : '',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={line.productId} className="stock-line">
                  <input
                    type="checkbox"
                    checked={selected.has(line.productId)}
                    onChange={() => toggle(line.productId)}
                    aria-label={`Seleccionar ${line.productName}`}
                    disabled={busy}
                  />
                  {line.imageUrl ? (
                    <img className="stock-thumb" src={mediaUrl(line.imageUrl)} alt="" />
                  ) : (
                    <span className="stock-thumb" />
                  )}
                  <div className="stock-line-name">
                    <strong>{line.productName}</strong>
                    <p className="muted">{meta}</p>
                  </div>
                  <div className="stock-edit">
                    <input
                      className="stock-qty"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_AVAILABLE}
                      step={1}
                      value={draft}
                      aria-label={`Disponible de ${line.productName}`}
                      disabled={busy && savingId !== line.productId}
                      onChange={(event) => {
                        setDrafts((current) => ({ ...current, [line.productId]: event.target.value }));
                        setSavedId('');
                      }}
                    />
                    {dirty || savingId === line.productId ? (
                      <button
                        type="button"
                        className="secondary stock-save"
                        disabled={!dirty || busy}
                        onClick={() => void save(line)}
                      >
                        {savingId === line.productId ? '…' : 'Guardar'}
                      </button>
                    ) : null}
                  </div>
                  {message ? (
                    <p className="error stock-line-note" role="alert">
                      {message}
                    </p>
                  ) : null}
                  {savedId === line.productId ? <p className="success stock-line-note">Listo.</p> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
