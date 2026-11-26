import { type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import type { OrderReports, ProductReports } from '../../api/types';
import { getToken } from '../../auth/session';
import { DateFilter } from '../../components/DateFilter';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(
    new Date(year, month - 1, day),
  );
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const body = [headers, ...rows].map((row) => row.map(escape).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function queryString(from: string, to: string, branchId: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (branchId) params.set('branchId', branchId);
  const q = params.toString();
  return q ? `?${q}` : '';
}

function LineChart({ points }: { points: { label: string; value: number }[] }) {
  const height = 180;
  const pad = 28;
  const width = Math.max(560, pad * 2 + Math.max(points.length - 1, 1) * 36);
  const max = Math.max(...points.map((p) => p.value), 1);
  const step = points.length <= 1 ? 0 : (width - pad * 2) / (points.length - 1);
  const labelEvery = points.length > 14 ? Math.ceil(points.length / 10) : 1;
  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = height - pad - (p.value / max) * (height - pad * 2);
    return { x, y, ...p, showLabel: i % labelEvery === 0 || i === points.length - 1 };
  });
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  if (points.length === 0) {
    return <p className="muted">Sin pedidos en el período</p>;
  }

  return (
    <div className="reports-chart-scroll">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Pedidos por día"
        style={{ width: `${width}px`, maxWidth: 'none', height: `${height}px` }}
      >
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#fed7aa" strokeWidth="1" />
        <path d={path} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinejoin="round" />
        {coords.map((c) => (
          <g key={c.label}>
            <circle cx={c.x} cy={c.y} r="3.5" fill="#c2410c" />
            {c.showLabel ? (
              <text x={c.x} y={height - 8} textAnchor="middle" fontSize="10" fill="#78716c">
                {formatDay(c.label)}
              </text>
            ) : null}
            <text x={c.x} y={c.y - 8} textAnchor="middle" fontSize="10" fill="#1c1917" fontWeight="700">
              {c.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function BarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const height = 280;
  const padBottom = 36;
  const padTop = 32;
  const padX = 28;
  const slot = 120;
  const barWidth = 72;
  const width = padX * 2 + Math.max(bars.length, 1) * slot;
  const max = Math.max(...bars.map((b) => b.value), 1);

  if (bars.length === 0) {
    return <p className="muted">Sin datos</p>;
  }

  return (
    <div className="reports-chart-scroll">
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Pedidos por estado"
      style={{ width: `${Math.max(width, 640)}px`, maxWidth: 'none', height: `${height}px` }}
    >
      <line x1={padX} y1={height - padBottom} x2={width - padX} y2={height - padBottom} stroke="#fed7aa" strokeWidth="1" />
      {bars.map((bar, i) => {
        const h = (bar.value / max) * (height - padTop - padBottom);
        const x = padX + i * slot + (slot - barWidth) / 2;
        const y = height - padBottom - h;
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={barWidth} height={Math.max(h, 0)} rx="4" fill="#f97316" />
            <text x={x + barWidth / 2} y={Math.max(y - 8, 16)} textAnchor="middle" fontSize="14" fill="#1c1917" fontWeight="700">
              {bar.value}
            </text>
            <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" fontSize="12" fill="#78716c">
              {bar.label.length > 14 ? `${bar.label.slice(0, 13)}…` : bar.label}
            </text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}

const PIE_COLORS = ['#ea580c', '#c2410c', '#fb923c', '#9a3412', '#fdba74', '#44403c', '#a8a29e'];
const BRANCH_COLORS = ['#ea580c', '#0f766e', '#2563eb', '#a16207', '#7c3aed', '#be123c'];

function BranchProductChart({
  rows,
}: {
  rows: { branchId: string; branchName: string; productId: string; productName: string; unitsSold: number }[];
}) {
  if (rows.length === 0) return <p className="muted">Sin ventas</p>;

  const branches: { id: string; name: string }[] = [];
  const seenBranch = new Set<string>();
  for (const row of rows) {
    if (seenBranch.has(row.branchId)) continue;
    seenBranch.add(row.branchId);
    branches.push({ id: row.branchId, name: row.branchName });
  }

  const productMap = new Map<string, { id: string; name: string; total: number; byBranch: Map<string, number> }>();
  for (const row of rows) {
    const current = productMap.get(row.productId) ?? {
      id: row.productId,
      name: row.productName,
      total: 0,
      byBranch: new Map<string, number>(),
    };
    current.total += row.unitsSold;
    current.byBranch.set(row.branchId, (current.byBranch.get(row.branchId) ?? 0) + row.unitsSold);
    productMap.set(row.productId, current);
  }
  const products = [...productMap.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es'));
  const max = Math.max(1, ...products.flatMap((product) => branches.map((branch) => product.byBranch.get(branch.id) ?? 0)));

  const height = 360;
  const padTop = 28;
  const padBottom = 64;
  const padX = 16;
  const barWidth = 36;
  const barGap = 6;
  const groupGap = 20;
  const barsWidth = branches.length * barWidth + Math.max(branches.length - 1, 0) * barGap;
  const groupWidth = Math.max(barsWidth, 96);
  const barsOffset = (groupWidth - barsWidth) / 2;
  const width = padX * 2 + products.length * groupWidth + Math.max(products.length - 1, 0) * groupGap;
  const plotHeight = height - padTop - padBottom;

  return (
    <div className="reports-branch-chart">
      <ul className="reports-branch-legend">
        {branches.map((branch, index) => (
          <li key={branch.id}>
            <span className="reports-pie-swatch" style={{ background: BRANCH_COLORS[index % BRANCH_COLORS.length] }} />
            <span className="reports-ellipsis" title={branch.name}>
              {branch.name}
            </span>
          </li>
        ))}
      </ul>
      <div className="reports-chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Productos vendidos por sucursal"
          style={{ width: `${Math.max(width, 640)}px`, maxWidth: 'none', height: `${height}px` }}
        >
          <line
            x1={padX}
            y1={height - padBottom}
            x2={width - padX}
            y2={height - padBottom}
            stroke="#fed7aa"
            strokeWidth="1"
          />
          {products.map((product, productIndex) => {
            const groupX = padX + productIndex * (groupWidth + groupGap);
            const lines = productLabelLines(product.name);
            return (
              <g key={product.id}>
                <title>{product.name}</title>
                {branches.map((branch, branchIndex) => {
                  const value = product.byBranch.get(branch.id) ?? 0;
                  const barHeight = (value / max) * plotHeight;
                  const x = groupX + barsOffset + branchIndex * (barWidth + barGap);
                  const y = height - padBottom - barHeight;
                  return (
                    <g key={branch.id}>
                      <title>{`${branch.name} · ${product.name}: ${value}`}</title>
                      {value > 0 ? (
                        <text
                          x={x + barWidth / 2}
                          y={Math.max(y - 6, 14)}
                          textAnchor="middle"
                          fontSize="12"
                          fill="#1c1917"
                          fontWeight="700"
                        >
                          {value}
                        </text>
                      ) : null}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(barHeight, 0)}
                        rx="3"
                        fill={BRANCH_COLORS[branchIndex % BRANCH_COLORS.length]}
                      />
                    </g>
                  );
                })}
                {lines.map((line, lineIndex) => (
                  <text
                    key={lineIndex}
                    x={groupX + groupWidth / 2}
                    y={height - 14 - (lines.length - 1 - lineIndex) * 15}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#57534e"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function productLabelLines(name: string): string[] {
  const max = 12;
  if (name.length <= max) return [name];
  const space = name.lastIndexOf(' ', max);
  const splitAt = space >= 4 ? space : max;
  const first = name.slice(0, splitAt).trim();
  let second = name.slice(splitAt).trim();
  if (!second) return [first];
  if (second.length > max) second = `${second.slice(0, max - 1)}…`;
  return [first, second];
}

function pieSlicePath(cx: number, cy: number, outer: number, inner: number, start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0;
  const point = (radius: number, angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });
  const a = point(outer, start);
  const b = point(outer, end);
  const c = point(inner, end);
  const d = point(inner, start);
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 ${large} 0 ${d.x} ${d.y} Z`;
}

function PieChart({
  slices,
  formatValue,
}: {
  slices: { id: string; name: string; value: number; percent: number }[];
  formatValue: (value: number) => string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (slices.length === 0 || total <= 0) {
    return <p className="muted">Sin ventas en el filtro</p>;
  }

  const cx = 90;
  const cy = 90;
  const outer = 78;
  const inner = 46;
  let angle = -Math.PI / 2;
  const wedges = slices.map((slice, index) => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const start = angle;
    angle += sweep;
    const full = sweep >= Math.PI * 2 - 0.0001;
    const path = full
      ? `M ${cx} ${cy - outer} A ${outer} ${outer} 0 1 1 ${cx - 0.01} ${cy - outer} L ${cx - 0.01} ${cy - inner} A ${inner} ${inner} 0 1 0 ${cx} ${cy - inner} Z`
      : pieSlicePath(cx, cy, outer, inner, start, angle);
    return { ...slice, path, color: PIE_COLORS[index % PIE_COLORS.length] };
  });

  return (
    <div className="reports-pie">
      <svg viewBox="0 0 180 180" role="img" aria-label={wedges.map((wedge) => `${wedge.name} ${wedge.percent}%`).join(', ')}>
        {wedges.map((wedge) => (
          <path key={wedge.id} d={wedge.path} fill={wedge.color}>
            <title>{`${wedge.name}: ${formatValue(wedge.value)} (${wedge.percent}%)`}</title>
          </path>
        ))}
      </svg>
      <ul className="reports-pie-legend">
        {wedges.map((wedge) => (
          <li key={wedge.id}>
            <span className="reports-pie-swatch" style={{ background: wedge.color }} />
            <span className="reports-pie-label">
              <span className="reports-pie-name">{wedge.name}</span>
              <strong>
                {wedge.percent.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </strong>
            </span>
            <span className="muted">{formatValue(wedge.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportCard({
  title,
  badge,
  onCsv,
  children,
}: {
  title: string;
  badge?: string;
  onCsv?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="card stack reports-card">
      <div className="reports-card-head">
        <div className="reports-card-title">
          <h2>{title}</h2>
          {badge ? <span className="reports-tag">{badge}</span> : null}
        </div>
      </div>
      <div className="reports-card-body">{children}</div>
      {onCsv ? (
        <div className="reports-row-actions">
          <button type="button" className="secondary" onClick={onCsv}>
            Descargar CSV
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ReportRow({
  id,
  title,
  open,
  onToggle,
  onCsv,
  columns,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  onCsv?: () => void;
  columns?: 3;
  children: ReactNode;
}) {
  const panelId = `report-row-${id}`;
  return (
    <section className={`card reports-row${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="reports-card-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(id)}
      >
        <span className="reports-card-title">
          <h2>{title}</h2>
        </span>
        <span className="reports-card-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div id={panelId} className="reports-row-panel">
          <div className={columns === 3 ? 'reports-row-body reports-row-3' : 'reports-row-body'}>{children}</div>
          {onCsv ? (
            <div className="reports-row-actions">
              <button type="button" className="secondary" onClick={onCsv}>
                Descargar CSV
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ReportTable({ children }: { children: ReactNode }) {
  return <div className="reports-table-wrap">{children}</div>;
}

function useMenuDismiss(open: boolean, onClose: () => void, rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, rootRef]);
}

function BranchFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; name: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const label = options.find((branch) => branch.id === value)?.name ?? 'Todas';
  const choices = [{ id: '', name: 'Todas' }, ...options];

  useMenuDismiss(open, close, rootRef);

  return (
    <div className="reports-branch-filter" ref={rootRef}>
      <button
        type="button"
        className={`reports-branch-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
      </button>
      {open ? (
        <ul className="reports-branch-menu" role="listbox" aria-label="Sucursal">
          {choices.map((choice) => {
            const selected = choice.id === value;
            return (
              <li key={choice.id || 'all'} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`reports-branch-option${selected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(choice.id);
                    setOpen(false);
                  }}
                >
                  {choice.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function AdminReportsPage() {
  const token = getToken() ?? '';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<ProductReports | null>(null);
  const [orders, setOrders] = useState<OrderReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    ops: true,
    share: true,
    'products-branch': true,
  });
  const toggleReport = useCallback((id: string) => {
    setOpenIds((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (from && to && from > to) {
        setError('El rango de fechas es inválido');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const q = queryString(from, to, branchId);
      try {
        const [productData, orderData] = await Promise.all([
          api<ProductReports>(`/admin/reports/products${q}`, { token }),
          api<OrderReports>(`/admin/reports/orders${q}`, { token }),
        ]);
        if (cancelled) return;
        setProducts(productData);
        setOrders(orderData);
        setBranches(orderData.branches ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, from, to, branchId]);

  const dayPoints = useMemo(
    () => (orders?.ordersByDay ?? []).map((row) => ({ label: row.date, value: row.count })),
    [orders],
  );
  const statusBars = useMemo(
    () => (orders?.ordersByStatus ?? []).filter((row) => row.count > 0).map((row) => ({ label: row.label, value: row.count })),
    [orders],
  );

  return (
    <section className="stack reports-page">
      <header className="page-head">
        <div>
          <h1>Reportes</h1>
          <p className="muted">Filtrá por fecha (día de Argentina) y sucursal. Cada listado se puede descargar.</p>
        </div>
      </header>

      <div className="admin-toolbar orders-toolbar">
        <label className="search-label">
          Desde
          <DateFilter label="Desde" value={from} onChange={setFrom} />
        </label>
        <label className="search-label">
          Hasta
          <DateFilter label="Hasta" value={to} onChange={setTo} />
        </label>
        <label className="search-label">
          Sucursal
          <BranchFilter value={branchId} options={branches} onChange={setBranchId} />
        </label>
      </div>

      {error ? (
        <p className="error reports-filter-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !products && !orders ? <p className="muted">Cargando reportes...</p> : null}
      {loading && (products || orders) ? <p className="muted">Actualizando...</p> : null}

      {orders && products ? (
        <div className="reports-rows">
          <ReportRow
            id="ops"
            title="Sin stock, cancelados y tiempo promedio"
            columns={3}
            open={Boolean(openIds.ops)}
            onToggle={toggleReport}
          >
          <ReportCard
            title="Sin stock"
            badge="Actual"
            onCsv={() =>
              downloadCsv(
                'sin-stock.csv',
                ['Producto', 'Sucursal', 'Stock'],
                products.outOfStock.map((r) => [r.name, r.branchName ?? '', r.stock ?? 0]),
              )
            }
          >
            {products.outOfStock.length === 0 ? (
              <p className="muted">Todos con stock</p>
            ) : (
              <ul className="reports-stock-list">
                {products.outOfStock.map((item) => (
                  <li key={item.id}>
                    <span className="reports-ellipsis" title={item.name}>
                      {item.name}
                    </span>
                    <span className="muted reports-ellipsis" title={item.branchName ?? ''}>
                      {item.branchName ?? '—'}
                    </span>
                    <strong>{item.stock ?? 0}</strong>
                  </li>
                ))}
              </ul>
            )}
          </ReportCard>
          <ReportCard
            title="Cancelados"
            badge={`${orders.cancelled.percent}%`}
          >
            <p className="reports-metric">{orders.cancelled.count}</p>
            <p className="muted reports-metric-hint">
              {orders.cancelled.percent}% del total en el filtro
            </p>
          </ReportCard>

          <ReportCard
            title="Tiempo promedio de entrega"
          >
            <p className="reports-metric">
              {orders.averageDeliveryMinutes == null
                ? '—'
                : `${orders.averageDeliveryMinutes.toLocaleString('es-AR')} min`}
            </p>
            <p className="muted reports-metric-hint">De confirmado a entregado / retirado</p>
          </ReportCard>
          </ReportRow>

          <ReportRow
            id="share"
            title="Participación en el total"
            open={Boolean(openIds.share)}
            onToggle={toggleReport}
            onCsv={() =>
              downloadCsv(
                'participacion-productos.csv',
                ['Tipo', 'Producto', 'Valor', 'Porcentaje'],
                [
                  ...products.quantityShare.slices.map((slice) => ['Cantidad', slice.name, slice.value, slice.percent]),
                  ...products.revenueShare.slices.map((slice) => ['Facturación', slice.name, slice.value, slice.percent]),
                ],
              )
            }
          >
            <p className="muted reports-metric-hint">
              Sin cancelados. Cada porción es lo que ese producto representa del total vendido en el filtro.
            </p>
            <div className="reports-pies">
              <div className="reports-pie-block">
                <h3>Cantidad vendida</h3>
                <p className="muted reports-metric-hint">
                  Total: {products.quantityShare.total.toLocaleString('es-AR')} unidades
                </p>
                <PieChart
                  slices={products.quantityShare.slices}
                  formatValue={(value) => `${value.toLocaleString('es-AR')} u.`}
                />
              </div>
              <div className="reports-pie-block">
                <h3>Facturación</h3>
                <p className="muted reports-metric-hint">Total: {formatMoney(products.revenueShare.total)}</p>
                <PieChart slices={products.revenueShare.slices} formatValue={formatMoney} />
              </div>
            </div>
          </ReportRow>

          <ReportRow
            id="products-branch"
            title="Productos vendidos por sucursal"
            open={Boolean(openIds['products-branch'])}
            onToggle={toggleReport}
            onCsv={() =>
              downloadCsv(
                'productos-por-sucursal.csv',
                ['Sucursal', 'Producto', 'Unidades'],
                orders.productsByBranch.map((row) => [row.branchName, row.productName, row.unitsSold]),
              )
            }
          >
            <BranchProductChart rows={orders.productsByBranch} />
          </ReportRow>

          <ReportRow
            id="ranking"
            title="Más vendidos, menos vendidos y mayor facturación"
            columns={3}
            open={Boolean(openIds.ranking)}
            onToggle={toggleReport}
          >
            <ReportCard
              title="Más vendidos"
              badge="Top 10"
              onCsv={() =>
                downloadCsv('mas-vendidos.csv', ['Producto', 'Unidades'], products.topSelling.map((row) => [row.name, row.unitsSold ?? 0]))
              }
            >
              <ReportTable>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ textAlign: 'right' }}>Unidades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.topSelling.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="muted">Sin ventas</td>
                      </tr>
                    ) : (
                      products.topSelling.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.unitsSold}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ReportTable>
            </ReportCard>
            <ReportCard
              title="Menos vendidos"
              onCsv={() =>
                downloadCsv('menos-vendidos.csv', ['Producto', 'Unidades'], products.leastSelling.map((row) => [row.name, row.unitsSold ?? 0]))
              }
            >
              <ReportTable>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ textAlign: 'right' }}>Unidades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.leastSelling.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td style={{ textAlign: 'right' }}>{item.unitsSold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ReportTable>
            </ReportCard>
            <ReportCard
              title="Mayor facturación"
              onCsv={() =>
                downloadCsv('mayor-facturacion.csv', ['Producto', 'Total'], products.topRevenue.map((row) => [row.name, row.totalRevenue ?? 0]))
              }
            >
              <ReportTable>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.topRevenue.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="muted">Sin facturación</td>
                      </tr>
                    ) : (
                      products.topRevenue.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(item.totalRevenue ?? 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ReportTable>
            </ReportCard>
          </ReportRow>

          <ReportRow
            id="days"
            title="Pedidos por día"
            open={Boolean(openIds.days)}
            onToggle={toggleReport}
            onCsv={() =>
              downloadCsv(
                'pedidos-por-dia.csv',
                ['Fecha', 'Cantidad'],
                orders.ordersByDay.map((row) => [row.date, row.count]),
              )
            }
          >
            <LineChart points={dayPoints} />
          </ReportRow>

          <ReportRow
            id="status"
            title="Pedidos por estado"
            open={Boolean(openIds.status)}
            onToggle={toggleReport}
            onCsv={() =>
              downloadCsv(
                'pedidos-por-estado.csv',
                ['Estado', 'Cantidad'],
                orders.ordersByStatus.map((row) => [row.label, row.count]),
              )
            }
          >
            <BarChart bars={statusBars} />
          </ReportRow>

          <ReportRow
            id="branches"
            title="Por sucursal y promociones"
            columns={3}
            open={Boolean(openIds.branches)}
            onToggle={toggleReport}
          >
          <ReportCard
            title="Pedidos por sucursal"
            onCsv={() =>
              downloadCsv(
                'pedidos-por-sucursal.csv',
                ['Sucursal', 'Cantidad'],
                orders.ordersByBranch.map((r) => [r.branchName, r.count]),
              )
            }
          >
            <ReportTable>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th style={{ textAlign: 'right' }}>Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.ordersByBranch.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="muted">
                        Sin pedidos
                      </td>
                    </tr>
                  ) : (
                    orders.ordersByBranch.map((row) => (
                      <tr key={row.branchId}>
                        <td>{row.branchName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ReportTable>
          </ReportCard>

          <ReportCard
            title="Ventas por sucursal"
            onCsv={() =>
              downloadCsv(
                'ventas-por-sucursal.csv',
                ['Sucursal', 'Total'],
                orders.salesByBranch.map((r) => [r.branchName, r.totalAmount]),
              )
            }
          >
            <ReportTable>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.salesByBranch.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="muted">
                        Sin ventas
                      </td>
                    </tr>
                  ) : (
                    orders.salesByBranch.map((row) => (
                      <tr key={row.branchId}>
                        <td>{row.branchName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(row.totalAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ReportTable>
          </ReportCard>

          <ReportCard
            title="Promociones más usadas"
            onCsv={() =>
              downloadCsv(
                'promociones.csv',
                ['Promoción', 'Pedidos', 'Descuento total'],
                orders.topPromotions.map((r) => [r.promotionName, r.orderCount, r.totalDiscount]),
              )
            }
          >
            <ReportTable>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Promoción</th>
                    <th style={{ textAlign: 'right' }}>Pedidos</th>
                    <th style={{ textAlign: 'right' }}>Descuento</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.topPromotions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">
                        Sin promociones aplicadas
                      </td>
                    </tr>
                  ) : (
                    orders.topPromotions.map((row) => (
                      <tr key={row.promotionName}>
                        <td>{row.promotionName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.orderCount}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(row.totalDiscount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ReportTable>
          </ReportCard>

          </ReportRow>

          <ReportRow
            id="top3"
            title="Top 3 clientes"
            open={Boolean(openIds.top3)}
            onToggle={toggleReport}
            onCsv={() =>
              downloadCsv(
                'top-3-clientes.csv',
                ['Nombre', 'Email', 'Pedidos'],
                orders.topCustomers.map((row) => [row.name, row.email, row.orderCount]),
              )
            }
          >
            <ReportTable>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th style={{ textAlign: 'right' }}>Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.topCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="muted">Sin clientes en el período</td>
                    </tr>
                  ) : (
                    orders.topCustomers.map((row) => (
                      <tr key={row.userId}>
                        <td>
                          <div className="reports-ellipsis" title={row.name}>{row.name}</div>
                          <div className="reports-ellipsis muted" title={row.email}>{row.email}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.orderCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ReportTable>
          </ReportRow>
        </div>
      ) : null}
    </section>
  );
}
