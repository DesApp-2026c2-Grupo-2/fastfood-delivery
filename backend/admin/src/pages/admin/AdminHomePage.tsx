import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Category, Product, Branch } from '../../api/types';
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [categoryList, productList, branchList] = await Promise.all([
          api<Category[]>('/admin/categories', { token }),
          api<Product[]>('/admin/products', { token }),
          api<Branch[]>('/admin/branches', { token }),
        ]);
        if (cancelled) return;
        setCategories(categoryList);
        setProducts(productList);
        setBranches(branchList);
      } catch {
        if (!cancelled) {
          setCategories([]);
          setProducts([]);
          setBranches([]);
        }
      }
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

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Cocina Mordi</h1>
          <p className="muted">Demo del sprint: armar el menú (categorías y productos).</p>
        </div>
      </header>

      <ol className="demo-steps">
        <li>Creá una categoría (ej. Hamburguesas).</li>
        <li>Creá un producto con precio y una o más fotos.</li>
        <li>Marcá uno como no disponible y comprobá que no aparece en el catálogo.</li>
      </ol>

      <div className="admin-home-links">
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
