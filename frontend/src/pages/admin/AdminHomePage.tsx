import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Category, Product } from '../../api/types';
import { getToken } from '../../auth/session';

export function AdminHomePage() {
  const token = getToken() ?? '';
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [hiddenCount, setHiddenCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [categories, products] = await Promise.all([
          api<Category[]>('/admin/categories', { token }),
          api<Product[]>('/admin/products', { token }),
        ]);
        if (cancelled) return;
        setCategoryCount(categories.length);
        setProductCount(products.length);
        setHiddenCount(products.filter((product) => !product.available).length);
      } catch {
        if (!cancelled) {
          setCategoryCount(0);
          setProductCount(0);
          setHiddenCount(0);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
        <li>Creá un producto con precio e imagen URL.</li>
        <li>Marcá uno como no disponible y comprobá que no aparece en el catálogo.</li>
      </ol>

      <div className="admin-home-links">
        <Link className="card-link" to="/admin/categories">
          <span>Categorías</span>
          <small>{categoryCount === null ? '…' : `${categoryCount} cargadas`}</small>
        </Link>
        <Link className="card-link" to="/admin/products">
          <span>Productos</span>
          <small>
            {productCount === null
              ? '…'
              : `${productCount} en el menú${hiddenCount ? ` · ${hiddenCount} ocultos` : ''}`}
          </small>
        </Link>
      </div>

      <p className="muted">
        Para ver lo que ve el cliente:{' '}
        <Link to="/products" target="_blank" rel="noreferrer">
          abrir catálogo
        </Link>
        .
      </p>
    </section>
  );
}
