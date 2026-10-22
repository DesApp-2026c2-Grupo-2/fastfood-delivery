import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Category, Product } from '../../api/types';
import { ProductTags, PromoBadge } from '../../components/ProductTags';
import { mediaUrl } from '../../lib/media';
import { formatPrice } from '../../lib/money';

const MENU_CATEGORY_ORDER = ['hamburguesas', 'guarnicion', 'bebidas', 'aderezos'];

function categoryKey(category: Category) {
  return (category.slug || category.name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function menuCategories(categoryList: Category[]) {
  const hasCounts = categoryList.some((category) => typeof category._count?.products === 'number');
  return MENU_CATEGORY_ORDER.flatMap((slug) => {
    const category = categoryList.find((item) => categoryKey(item) === slug);
    if (!category) return [];
    if (hasCounts && (category._count?.products ?? 0) === 0) return [];
    return [category];
  });
}

export function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId') ?? '';
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [categoryList, productList] = await Promise.all([
          api<Category[]>('/categories'),
          api<Product[]>(categoryId ? `/products?categoryId=${encodeURIComponent(categoryId)}` : '/products'),
        ]);
        if (!cancelled) {
          setCategories(menuCategories(categoryList));

          // Excluir productos que pertenezcan a 'adicional' para que no se compren sueltos
          const visibleProducts = productList.filter((p) => {
            const hasExtraCategory = p.categories?.some(
              (c) => c.slug === 'adicional' || c.name?.toLowerCase() === 'adicional'
            );
            const singleCategoryExtra = p.category?.name?.toLowerCase() === 'adicional';
            return !hasExtraCategory && !singleCategoryExtra;
          });

          setProducts(visibleProducts);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const selectedName = useMemo(
    () => categories.find((category) => category.id === categoryId)?.name,
    [categories, categoryId],
  );

  return (
    <section>
      <h1>Productos</h1>
      <p className="muted">
        Cositas ricas{selectedName ? ` · ${selectedName}` : ' para pedir'}.
      </p>

      <div className="filters">
        <button
          type="button"
          className={!categoryId ? 'chip chip-active' : 'chip'}
          onClick={() => setSearchParams({})}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={categoryId === category.id ? 'chip chip-active' : 'chip'}
            onClick={() => setSearchParams({ categoryId: category.id })}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? <p className="muted">Calentando el horno…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error && products.length === 0 ? (
        <p className="empty">Todavía no hay nada para morder. El admin puede cargar el menú.</p>
      ) : null}

      <ul className="product-grid">
        {products.map((product) => (
          <li key={product.id}>
            <Link className="product-card" to={`/products/${product.id}`}>
              <span className="product-card-media">
                <img src={mediaUrl(product.images?.[0]?.url || product.imageUrl)} alt="" onError={onImageError} />
                {product.twoForOne ? <PromoBadge /> : null}
              </span>
              <div>
                <h2>{product.name}</h2>
                <ProductTags product={product} />
                <strong>{formatPrice(product.price)}</strong>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function onImageError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.src =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="%23FFEDD5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23EA580C" font-family="Nunito,sans-serif" font-size="22">sin fotito</text></svg>';
}
