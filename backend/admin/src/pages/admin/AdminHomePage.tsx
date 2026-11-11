import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { AdminAccount, AdminOrderListResponse, Branch, Category, OrderReports, Product, Promotion } from '../../api/types';
import { getToken, isOrdersViewer } from '../../auth/session';

const LATEST = 5;

type ParameterRow = { key: string; label: string; value: number; unit: string };

type ReportItem = { id: string; name: string; unitsSold?: number };

type ProductReports = {
  topSelling: ReportItem[];
  outOfStock: ReportItem[];
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
}

function promotionLabel(promotion: Promotion) {
  if (promotion.type === 'two_for_one') {
    return promotion.productName ? `2x1 · ${promotion.productName}` : '2x1';
  }
  const percent = `${promotion.value}%`;
  return promotion.minSubtotal != null ? `${percent} desde ${formatMoney(promotion.minSubtotal)}` : percent;
}

function argentinaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftDay(iso: string, delta: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + delta));
  return next.toISOString().slice(0, 10);
}

function formatDay(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day));
}

function sumBilling(report: OrderReports | null) {
  return (report?.salesByBranch ?? []).reduce((sum, row) => sum + row.totalAmount, 0);
}

function sumOrders(report: OrderReports | null) {
  return (report?.ordersByStatus ?? []).reduce((sum, row) => sum + row.count, 0);
}

function StatusBars({ bars }: { bars: { label: string; value: number }[] }) {
  const max = bars.reduce((highest, bar) => Math.max(highest, bar.value), 0);
  if (bars.length === 0 || max === 0) {
    return <p className="home-latest-empty">Sin pedidos.</p>;
  }
  return (
    <ul className="home-bars home-status-bars">
      {bars.map((bar) => (
        <li key={bar.label}>
          <strong title={bar.label}>{bar.label}</strong>
          <span className="home-bar-track">
            <span className="home-bar-fill" style={{ width: `${Math.max(8, (bar.value / max) * 100)}%` }} />
          </span>
          <small>{bar.value}</small>
        </li>
      ))}
    </ul>
  );
}

function SalesLine({ points }: { points: { label: string; value: number }[] }) {
  const height = 160;
  const pad = 24;
  const width = 520;
  const max = Math.max(...points.map((point) => point.value), 1);
  const step = points.length <= 1 ? 0 : (width - pad * 2) / (points.length - 1);
  const coords = points.map((point, index) => ({
    x: pad + index * step,
    y: height - pad - (point.value / max) * (height - pad * 2),
    ...point,
  }));
  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ventas de los últimos 7 días">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#fed7aa" strokeWidth="1" />
      <path d={path} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinejoin="round" />
      {coords.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="3.5" fill="#c2410c" />
          <text x={point.x} y={height - 6} textAnchor="middle" fontSize="11" fill="#78716c">
            {formatDay(point.label)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function OrderDashboard({ token }: { token: string }) {
  const [todayReport, setTodayReport] = useState<OrderReports | null>(null);
  const [weekReport, setWeekReport] = useState<OrderReports | null>(null);
  const [statusReport, setStatusReport] = useState<OrderReports | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const today = argentinaToday();
    const from = shiftDay(today, -6);
    async function load() {
      try {
        const [todayData, weekData, statusData] = await Promise.all([
          api<OrderReports>(`/admin/reports/orders?from=${today}&to=${today}`, { token }),
          api<OrderReports>(`/admin/reports/orders?from=${from}&to=${today}`, { token }),
          api<OrderReports>('/admin/reports/orders', { token }),
        ]);
        if (cancelled) return;
        setTodayReport(todayData);
        setWeekReport(weekData);
        setStatusReport(statusData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el tablero');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const salesByDay = new Map((weekReport?.salesByDay ?? []).map((row) => [row.date, row.totalAmount]));
  const today = argentinaToday();
  const points = Array.from({ length: 7 }, (_, index) => {
    const label = shiftDay(today, index - 6);
    return { label, value: salesByDay.get(label) ?? 0 };
  });
  const bars = (statusReport?.ordersByStatus ?? [])
    .filter((row) => row.count > 0)
    .map((row) => ({ label: row.label, value: row.count }));

  return (
    <section className="home-dashboard" aria-label="Pedidos">
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="home-kpis">
        <article className="home-kpi">
          <span>Pedidos de hoy</span>
          <strong>{todayReport ? sumOrders(todayReport) : '…'}</strong>
        </article>
        <article className="home-kpi">
          <span>Facturación de hoy</span>
          <strong>{todayReport ? formatMoney(sumBilling(todayReport)) : '…'}</strong>
        </article>
      </div>
      <div className="home-charts">
        <article className="home-panel home-chart">
          <h2>Pedidos por estado</h2>
          <p className="muted">Todos</p>
          {statusReport ? <StatusBars bars={bars} /> : <p className="home-latest-empty">Cargando…</p>}
        </article>
        <article className="home-panel home-chart">
          <h2>Ventas</h2>
          <p className="muted">Últimos 7 días, sin cancelados</p>
          {weekReport ? <SalesLine points={points} /> : <p className="home-latest-empty">Cargando…</p>}
        </article>
      </div>
    </section>
  );
}

export function AdminHomePage() {
  const token = getToken() ?? '';
  const viewer = isOrdersViewer();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [customerTotal, setCustomerTotal] = useState<number | null>(null);
  const [parameters, setParameters] = useState<ParameterRow[] | null>(null);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);
  const [reports, setReports] = useState<ProductReports | null>(null);

  useEffect(() => {
    if (viewer) return;
    let cancelled = false;
    async function load() {
      const [categoryList, productList, branchList, promotionList, adminList, customerList, parameterList, orders, pending, reportData] =
        await Promise.all([
          api<Category[]>('/admin/categories', { token }).catch(() => [] as Category[]),
          api<Product[]>('/admin/products', { token }).catch(() => [] as Product[]),
          api<Branch[]>('/admin/branches', { token }).catch(() => [] as Branch[]),
          api<Promotion[]>('/admin/promotions', { token }).catch(() => [] as Promotion[]),
          api<AdminAccount[]>('/admin/admins', { token }).catch(() => [] as AdminAccount[]),
          api<{ total: number }>('/admin/customers', { token }).catch(() => null),
          api<ParameterRow[]>('/admin/parameters', { token }).catch(() => [] as ParameterRow[]),
          api<AdminOrderListResponse>('/admin/orders', { token }).catch(() => null),
          api<AdminOrderListResponse>('/admin/orders?status=pending', { token }).catch(() => null),
          api<ProductReports>('/admin/reports/products', { token }).catch(() => ({ topSelling: [], outOfStock: [] })),
        ]);
      if (cancelled) return;
      setCategories(categoryList);
      setProducts(productList);
      setBranches(branchList);
      setPromotions(promotionList);
      setAdmins(adminList);
      setCustomerTotal(customerList?.total ?? null);
      setParameters(parameterList);
      setOrderTotal(orders?.total ?? null);
      setPendingOrders(pending?.total ?? null);
      setReports(reportData);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, viewer]);

  const hiddenCount = products?.filter((product) => !product.available).length ?? 0;
  const activePromotions = useMemo(
    () => (promotions ? promotions.filter((promotion) => promotion.active).slice(0, LATEST) : []),
    [promotions],
  );
  const radius = parameters?.find((parameter) => parameter.key === 'coverage_radius_km');
  const prep = parameters?.find((parameter) => parameter.key === 'eta_prep_base_min');
  const topSeller = reports?.topSelling[0];
  const topBars = reports?.topSelling.slice(0, 5) ?? [];
  const maxUnits = topBars.reduce((max, item) => Math.max(max, item.unitsSold ?? 0), 0);

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Cocina Mordi</h1>
          <p className="muted">
            {viewer
              ? 'Pedidos, reclamos y los cupones de esos reclamos.'
              : 'Pedidos, menú, sucursales, promociones, stock y reportes.'}
          </p>
        </div>
      </header>

      <OrderDashboard token={token} />

      {viewer ? null : (
      <>
      <div className="admin-home-links">
        <article className="home-panel">
          <Link className="card-link" to="/admin/reports">
            <span>Reportes</span>
            <small>
              {reports === null
                ? '…'
                : topSeller
                  ? `Más vendido: ${topSeller.name} · ${topSeller.unitsSold ?? 0} u.`
                  : 'Todavía no hay ventas'}
              {reports && reports.outOfStock.length > 0 ? ` · ${reports.outOfStock.length} sin stock` : ''}
            </small>
          </Link>
          {reports === null ? (
            <p className="home-latest-empty">Cargando…</p>
          ) : topBars.length === 0 ? (
            <p className="home-latest-empty">Todavía no hay ventas.</p>
          ) : (
            <div>
              <p className="home-latest-caption">Más vendidos</p>
              <ul className="home-bars">
                {topBars.map((item) => {
                  const units = item.unitsSold ?? 0;
                  const width = maxUnits > 0 ? Math.max(8, (units / maxUnits) * 100) : 0;
                  return (
                    <li key={item.id}>
                      <strong title={item.name}>{item.name}</strong>
                      <span className="home-bar-track">
                        <span className="home-bar-fill" style={{ width: `${width}%` }} />
                      </span>
                      <small>{units} u.</small>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </article>

        <article className="home-panel">
          <Link className="card-link" to="/admin/promotions">
            <span>Promociones</span>
            <small>
              {promotions === null
                ? '…'
                : `${promotions.length} cargadas · ${promotions.filter((promotion) => promotion.active).length} activas`}
            </small>
          </Link>
          {promotions && activePromotions.length > 0 ? (
            <div>
              <p className="home-latest-caption">Activas</p>
              <ul className="home-latest">
                {activePromotions.map((promotion) => (
                  <li key={promotion.id}>
                    <strong>{promotion.name}</strong>
                    <small>{promotionLabel(promotion)}</small>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="home-latest-empty">
              {promotions === null ? 'Cargando…' : 'No hay promociones activas.'}
            </p>
          )}
        </article>

        <article className="home-panel">
          <Link className="card-link" to="/admin/orders">
            <span>Pedidos</span>
            <small>
              {orderTotal === null
                ? '…'
                : `${orderTotal} en total${pendingOrders ? ` · ${pendingOrders} pendientes` : ''}`}
            </small>
          </Link>
        </article>

        <article className="home-panel">
          <Link className="card-link" to="/admin/stock">
            <span>Stock</span>
            <small>Disponible y reservado por sucursal</small>
          </Link>
        </article>

        <article className="home-panel">
          <Link className="card-link" to="/admin/products">
            <span>Productos</span>
            <small>
              {products === null
                ? '…'
                : `${products.length} en el menú${hiddenCount ? ` · ${hiddenCount} ocultos` : ''}`}
            </small>
          </Link>
        </article>

        <article className="home-panel">
          <Link className="card-link" to="/admin/categories">
            <span>Categorías</span>
            <small>{categories === null ? '…' : `${categories.length} cargadas`}</small>
          </Link>
        </article>

        <article className="home-panel">
          <Link className="card-link" to="/admin/branches">
            <span>Sucursales</span>
            <small>
              {branches === null
                ? '…'
                : `${branches.length} cargadas · ${branches.filter((branch) => branch.active).length} activas`}
            </small>
          </Link>
        </article>

        <article className="home-panel">
          <Link className="card-link" to="/admin/parameters">
            <span>Parámetros</span>
            <small>
              {parameters === null
                ? '…'
                : `Radio ${radius?.value ?? '—'} km · preparación base ${prep?.value ?? '—'} min`}
            </small>
          </Link>
        </article>

        <article className="home-panel">
          <Link className="card-link" to="/admin/customers">
            <span>Clientes</span>
            <small>{customerTotal === null ? '…' : `${customerTotal} registrados`}</small>
          </Link>
        </article>

        <article className="home-panel">
          <Link className="card-link" to="/admin/admins">
            <span>Administradores</span>
            <small>{admins === null ? '…' : `${admins.length} con acceso`}</small>
          </Link>
        </article>
      </div>

      <p className="muted">
        Para ver lo que ve el cliente:{' '}
        <a href={`${import.meta.env.VITE_CLIENT_URL ?? 'http://localhost:5173'}/products`} target="_blank" rel="noreferrer">
          abrir catálogo
        </a>
        .
      </p>
      </>
      )}
    </section>
  );
}
