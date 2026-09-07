import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Cart, Product } from '../../api/types';
import { getToken } from '../../auth/session';
import { ProductTags } from '../../components/ProductTags';
import { mediaUrl } from '../../lib/media';
import { formatPrice } from '../../lib/money';

export function ProductDetailPage() {
  const { id } = useParams();
  const token = getToken() ?? '';
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

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

  async function addToCart(event: FormEvent) {
    event.preventDefault();
    if (!product) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      await api<Cart>('/cart/items', {
        method: 'POST',
        token,
        body: JSON.stringify({
          productId: product.id,
          quantity,
          notes: notes.trim(),
        }),
      });
      setOk(
        quantity === 1
          ? 'Agregamos 1 unidad al carrito.'
          : `Agregamos ${quantity} unidades al carrito.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar al carrito');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Calentando el horno…</p>;
  if (error && !product) {
    return (
      <section>
        <p className="error">{error}</p>
        <Link to="/products">← volvamos al menú</Link>
      </section>
    );
  }
  if (!product) return null;

  const images = product.images?.length
    ? product.images
    : product.imageUrl
      ? [{ id: 'cover', url: product.imageUrl, sortOrder: 0 }]
      : [];

  return (
    <article className="detail">
      <Link to="/products">← volvamos al menú</Link>
      {images.length ? (
        <div className={images.length > 1 ? 'detail-gallery' : undefined}>
          {images.map((image) => (
            <img
              key={image.id}
              src={mediaUrl(image.url)}
              alt={product.name}
              onError={(event) => {
                event.currentTarget.src =
                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="%23FFEDD5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23EA580C" font-family="Nunito,sans-serif" font-size="22">sin fotito</text></svg>';
              }}
            />
          ))}
        </div>
      ) : null}
      <h1>{product.name}</h1>
      <ProductTags product={product} />
      <p className="price">{formatPrice(product.price)}</p>
      <p>{product.description}</p>

      <form className="card form" onSubmit={(event) => void addToCart(event)}>
        <h2>Agregar al carrito</h2>
        <label>
          Cantidad
          <div className="qty">
            <button
              type="button"
              className="secondary"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              aria-label="Menos"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            />
            <button type="button" className="secondary" onClick={() => setQuantity((current) => current + 1)} aria-label="Más">
              +
            </button>
          </div>
        </label>
        <label>
          Observaciones
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Sin cebolla, punto de cocción, etc."
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="success" role="status">
            {ok} <Link to="/cart">Ver carrito</Link>
          </p>
        ) : null}
        <button type="submit" disabled={saving}>
          {saving ? 'Agregando…' : 'Agregar al carrito'}
        </button>
      </form>
    </article>
  );
}
