import { type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import type { OrderReports, ProductReports } from '../../api/types';
import { getToken } from '../../auth/session';

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
    <div className="reports-chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Pedidos por día"
        style={{ width: `${width}px`, maxWidth: 'none', height: 'auto' }}
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
  const width = 560;
  const height = 200;
  const pad = 28;
  const max = Math.max(...bars.map((b) => b.value), 1);
  const gap = 10;
  const barWidth = bars.length === 0 ? 0 : (width - pad * 2 - gap * (bars.length - 1)) / bars.length;

  if (bars.length === 0) {
    return <p className="muted">Sin datos</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pedidos por estado" style={{ width: '100%', height: 'auto' }}>
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#fed7aa" strokeWidth="1" />
      {bars.map((bar, i) => {
        const h = (bar.value / max) * (height - pad * 2);
        const x = pad + i * (barWidth + gap);
        const y = height - pad - h;
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={barWidth} height={Math.max(h, 0)} rx="4" fill="#f97316" />
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#1c1917" fontWeight="700">
              {bar.value}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#78716c"
            >
              {bar.label.length > 10 ? `${bar.label.slice(0, 9)}…` : bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type SectionProps = {
  title: string;
  badge?: string;
  onCsv?: () => void;
  children: ReactNode;
  wide?: boolean;
};

function ReportSection({ title, badge, onCsv, children, wide }: SectionProps) {
  return (
    <section className={`card stack reports-card${wide ? ' reports-wide' : ''}`}>
      <div className="reports-card-head">
        <div className="reports-card-title">
          <h2>{title}</h2>
          {badge ? <span className="reports-tag">{badge}</span> : null}
        </div>
        {onCsv ? (
          <button type="button" className="secondary" onClick={onCsv}>
            Descargar CSV
          </button>
        ) : null}
      </div>
      {children}
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

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function formatDateDisplay(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return 'dd/mm/aaaa';
  return `${pad2(parsed.day)}/${pad2(parsed.month)}/${parsed.year}`;
}

function todayIsoAR() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function monthLabel(year: number, month: number) {
  const label = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

function DateFilter({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const selected = parseIsoDate(value);
  const initial = selected ?? parseIsoDate(todayIsoAR())!;
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  useMenuDismiss(open, close, rootRef);

  useEffect(() => {
    if (!open) return;
    const next = selected ?? parseIsoDate(todayIsoAR())!;
    setViewYear(next.year);
    setViewMonth(next.month);
  }, [open, selected?.year, selected?.month, selected?.day]);

  const days = useMemo(() => {
    const total = new Date(viewYear, viewMonth, 0).getDate();
    const firstDow = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7;
    const cells: Array<{ day: number; iso: string } | null> = [];
    for (let i = 0; i < firstDow; i += 1) cells.push(null);
    for (let day = 1; day <= total; day += 1) {
      cells.push({ day, iso: toIsoDate(viewYear, viewMonth, day) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  function shiftMonth(delta: number) {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  }

  return (
    <div className="reports-date-filter" ref={rootRef}>
      <button
        type="button"
        className={`reports-date-trigger${open ? ' is-open' : ''}${value ? '' : ' is-empty'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{formatDateDisplay(value)}</span>
      </button>
      {open ? (
        <div className="reports-date-menu" role="dialog" aria-label={label}>
          <div className="reports-date-nav">
            <button type="button" className="reports-date-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
              ‹
            </button>
            <strong>{monthLabel(viewYear, viewMonth)}</strong>
            <button type="button" className="reports-date-nav-btn" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
              ›
            </button>
          </div>
          <div className="reports-date-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="reports-date-grid">
            {days.map((cell, index) =>
              cell ? (
                <button
                  key={cell.iso}
                  type="button"
                  className={`reports-date-day${cell.iso === value ? ' is-selected' : ''}${cell.iso === todayIsoAR() ? ' is-today' : ''}`}
                  onClick={() => {
                    onChange(cell.iso);
                    setOpen(false);
                  }}
                >
                  {cell.day}
                </button>
              ) : (
                <span key={`empty-${index}`} className="reports-date-day is-empty" />
              ),
            )}
          </div>
          <div className="reports-date-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayIsoAR());
                setOpen(false);
              }}
            >
              Hoy
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
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

      {orders ? (
        <div className="reports-grid">
          <ReportSection
            title="Pedidos por día"
            wide
            onCsv={() =>
              downloadCsv(
                'pedidos-por-dia.csv',
                ['Fecha', 'Cantidad'],
                orders.ordersByDay.map((r) => [r.date, r.count]),
              )
            }
          >
            <LineChart points={dayPoints} />
          </ReportSection>

          <ReportSection
            title="Pedidos por estado"
            wide
            onCsv={() =>
              downloadCsv(
                'pedidos-por-estado.csv',
                ['Estado', 'Cantidad'],
                orders.ordersByStatus.map((r) => [r.label, r.count]),
              )
            }
          >
            <BarChart bars={statusBars} />
          </ReportSection>

          <ReportSection title="Cancelados" badge={`${orders.cancelled.percent}%`}>
            <p className="reports-metric">{orders.cancelled.count}</p>
            <p className="muted reports-metric-hint">
              {orders.cancelled.percent}% del total en el filtro
            </p>
          </ReportSection>

          <ReportSection title="Tiempo promedio de entrega">
            <p className="reports-metric">
              {orders.averageDeliveryMinutes == null
                ? '—'
                : `${orders.averageDeliveryMinutes.toLocaleString('es-AR')} min`}
            </p>
            <p className="muted reports-metric-hint">De confirmado a entregado / retirado</p>
          </ReportSection>

          <ReportSection
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
          </ReportSection>

          <ReportSection
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
          </ReportSection>

          <ReportSection
            title="Top 10 clientes"
            onCsv={() =>
              downloadCsv(
                'top-clientes.csv',
                ['Nombre', 'Email', 'Pedidos'],
                orders.topCustomers.map((r) => [r.name, r.email, r.orderCount]),
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
                      <td colSpan={2} className="muted">
                        Sin clientes en el período
                      </td>
                    </tr>
                  ) : (
                    orders.topCustomers.map((row) => (
                      <tr key={row.userId}>
                        <td>
                          <div>{row.name}</div>
                          <div className="muted" style={{ fontSize: '0.85rem' }}>
                            {row.email}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.orderCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ReportTable>
          </ReportSection>

          <ReportSection
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
          </ReportSection>

          <ReportSection
            title="Productos vendidos por sucursal"
            wide
            onCsv={() =>
              downloadCsv(
                'productos-por-sucursal.csv',
                ['Sucursal', 'Producto', 'Unidades'],
                orders.productsByBranch.map((r) => [r.branchName, r.productName, r.unitsSold]),
              )
            }
          >
            <ReportTable>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th>Producto</th>
                    <th style={{ textAlign: 'right' }}>Unidades</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.productsByBranch.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">
                        Sin ventas
                      </td>
                    </tr>
                  ) : (
                    orders.productsByBranch.map((row) => (
                      <tr key={`${row.branchId}-${row.productId}`}>
                        <td>{row.branchName}</td>
                        <td>{row.productName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.unitsSold}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ReportTable>
          </ReportSection>
        </div>
      ) : null}

      {products ? (
        <>
          <h2 style={{ marginTop: '1.5rem' }}>Productos</h2>
          <div className="reports-grid">
            <ReportSection
              title="Más vendidos"
              badge="Top 10"
              onCsv={() =>
                downloadCsv(
                  'mas-vendidos.csv',
                  ['Producto', 'Unidades'],
                  products.topSelling.map((r) => [r.name, r.unitsSold ?? 0]),
                )
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
                        <td colSpan={2} className="muted">
                          Sin ventas
                        </td>
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
            </ReportSection>

            <ReportSection
              title="Menos vendidos"
              onCsv={() =>
                downloadCsv(
                  'menos-vendidos.csv',
                  ['Producto', 'Unidades'],
                  products.leastSelling.map((r) => [r.name, r.unitsSold ?? 0]),
                )
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
            </ReportSection>

            <ReportSection
              title="Mayor facturación"
              onCsv={() =>
                downloadCsv(
                  'mayor-facturacion.csv',
                  ['Producto', 'Total'],
                  products.topRevenue.map((r) => [r.name, r.totalRevenue ?? 0]),
                )
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
                        <td colSpan={2} className="muted">
                          Sin facturación
                        </td>
                      </tr>
                    ) : (
                      products.topRevenue.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {formatMoney(item.totalRevenue ?? 0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ReportTable>
            </ReportSection>

            <ReportSection
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
              <ReportTable>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Sucursal</th>
                      <th style={{ textAlign: 'right' }}>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.outOfStock.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="muted">
                          Todos con stock
                        </td>
                      </tr>
                    ) : (
                      products.outOfStock.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.branchName ?? '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                            {item.stock}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ReportTable>
            </ReportSection>
          </div>
        </>
      ) : null}
    </section>
  );
}
