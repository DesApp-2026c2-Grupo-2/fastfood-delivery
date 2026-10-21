import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { AdminAccount, AdminOrderListResponse, Branch, Category, Product, Promotion } from '../../api/types';
import { getToken } from '../../auth/session';
import { mediaUrl } from '../../lib/media';

const LATEST = 5;

function byNewest<T extends { createdAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });
}

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

function formatWhen(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(date);
}

export function AdminHomePage() {
  const token = getToken() ?? '';
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [parameters, setParameters] = useState<ParameterRow[] | null>(null);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);
  const [reports, setReports] = useState<ProductReports | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [categoryList, productList, branchList, promotionList, adminList, parameterList, orders, pending, reportData] =
        await Promise.all([
          api<Category[]>('/admin/categories', { token }).catch(() => [] as Category[]),
          api<Product[]>('/admin/products', { token }).catch(() => [] as Product[]),
          api<Branch[]>('/admin/branches', { token }).catch(() => [] as Branch[]),
          api<Promotion[]>('/admin/promotions', { token }).catch(() => [] as Promotion[]),
          api<AdminAccount[]>('/admin/admins', { token }).catch(() => [] as AdminAccount[]),
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
      setParameters(parameterList);
      setOrderTotal(orders?.total ?? null);
      setPendingOrders(pending?.total ?? null);
      setReports(reportData);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const latestCategories = useMemo(
    () => (categories ? byNewest(categories).slice(0, LATEST) : []),
    [categories],
  );
  const latestProducts = useMemo(
    () => (products ? byNewest(products).slice(0, LATEST) : []),
    [products],
  );
  const hiddenCount = products?.filter((product) => !product.available).length ?? 0;
  const activePromotions = useMemo(
    () => (promotions ? promotions.filter((promotion) => promotion.active).slice(0, LATEST) : []),
    [promotions],
  );
  const radius = parameters?.find((parameter) => parameter.key === 'coverage_radius_km');
  const prep = parameters?.find((parameter) => parameter.key === 'eta_prep_base_min');
  const topSeller = reports?.topSelling[0];

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Cocina Mordi</h1>
          <p className="muted">Pedidos, menú, sucursales, promociones, stock y reportes.</p>
        </div>
      </header>

      <ol className="demo-steps">
        <li>Pedidos para seguir el estado. Stock y parámetros para la cobertura y el tiempo estimado.</li>
        <li>Productos, categorías y sucursales arman el menú que ve el cliente.</li>
        <li>Promociones: porcentaje con vigencia y monto mínimo, o 2x1 de un producto. Reportes muestra lo más vendido y el stock en cero.</li>
      </ol>

      <div className="admin-home-links">
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
          <Link className="card-link" to="/admin/admins">
            <span>Administradores</span>
            <small>{admins === null ? '…' : `${admins.length} con acceso`}</small>
          </Link>
        </article>

        <article className="home-panel">
          <Link className="card-link" to="/admin/categories">
            <span>Categorías</span>
            <small>{categories === null ? '…' : `${categories.length} cargadas`}</small>
          </Link>
          {categories && latestCategories.length > 0 ? (
            <div>
              <p className="home-latest-caption">Últimas cargadas</p>
              <ul className="home-latest">
                {latestCategories.map((category) => (
                  <li key={category.id}>
                    <strong>{category.name}</strong>
                    <small>{formatWhen(category.createdAt)}</small>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="home-latest-empty">{categories === null ? 'Cargando…' : 'Todavía no hay categorías.'}</p>
          )}
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
          {products && latestProducts.length > 0 ? (
            <div>
              <p className="home-latest-caption">Últimos cargados</p>
              <ul className="home-latest">
                {latestProducts.map((product) => (
                  <li key={product.id}>
                    <img
                      className="home-latest-thumb"
                      src={mediaUrl(product.images?.[0]?.url || product.imageUrl)}
                      alt=""
                    />
                    <div>
                      <strong>{product.name}</strong>
                      <small>{formatWhen(product.createdAt)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="home-latest-empty">{products === null ? 'Cargando…' : 'Todavía no hay productos.'}</p>
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
      </div>

      <p className="muted">
        Para ver lo que ve el cliente:{' '}
        <a href={`${import.meta.env.VITE_CLIENT_URL ?? 'http://localhost:5173'}/products`} target="_blank" rel="noreferrer">
          abrir catálogo
        </a>
        .
      </p>
    </section>
  );
}
