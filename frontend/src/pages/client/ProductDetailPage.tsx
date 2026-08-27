import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Product } from '../../api/types';

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
}

export function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const data = await api<Product>(`/products/${id}`);
        if (!cancelled) setProduct(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se encontró el producto');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p className="muted">Calentando el horno…</p>;
  if (error) {
    return (
      <section>
        <p className="error">{error}</p>
        <Link to="/products">← volvamos al menú</Link>
      </section>
    );
  }
  if (!product) return null;

  return (
    <article className="detail">
      <Link to="/products">← volvamos al menú</Link>
      <img
        src={product.imageUrl}
        alt={product.name}
        onError={(event) => {
          event.currentTarget.src =
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="%23FFEDD5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23EA580C" font-family="Nunito,sans-serif" font-size="22">sin fotito</text></svg>';
        }}
      />
      <p className="muted">{product.category?.name}</p>
      <h1>{product.name}</h1>
      <p className="price">{formatPrice(product.price)}</p>
      <p>{product.description}</p>
    </article>
  );
}
