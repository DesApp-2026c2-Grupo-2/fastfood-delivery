import { useCart } from '../../cart/CartContext';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Cart, Product } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { addGuestItem } from '../../cart/guestCart';
import { ProductTags } from '../../components/ProductTags';
import { mediaUrl } from '../../lib/media';
import { formatPrice } from '../../lib/money';

export function ProductDetailPage() {
  const { id } = useParams();
  const { refresh } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [availableExtras, setAvailableExtras] = useState<Product[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
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
        if (!cancelled) {
          setProduct(data);

          // Verificar si es hamburguesa para habilitar los adicionales
          const isBurger =
            data.slug?.includes('hamburguesa') ||
            data.name?.toLowerCase().includes('hamburguesa') ||
            data.categories?.some((c) => c.slug === 'hamburguesas');

          if (isBurger) {
            try {
              const allProducts = await api<Product[]>('/products');
              const extras = allProducts.filter(
                (p) =>
                  p.categories?.some((c) => c.slug === 'adicional') ||
                  p.category?.name?.toLowerCase() === 'adicional',
              );
              if (!cancelled) setAvailableExtras(extras);
            } catch {
              // Si falla la consulta de extras, permite seguir comprando el producto base
            }
          }
        }
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

  function handleToggleExtra(extraId: string) {
    setSelectedExtraIds((prev) =>
      prev.includes(extraId) ? prev.filter((item) => item !== extraId) : [...prev, extraId],
    );
  }

  // Cálculo del total de adicionales por unidad y precio final unitario
  const extrasTotalPerUnit = availableExtras
    .filter((extra) => selectedExtraIds.includes(extra.id))
    .reduce((sum, extra) => sum + Number(extra.price || 0), 0);

  const unitPriceWithExtras = (product ? Number(product.price) : 0) + extrasTotalPerUnit;

  async function addToCart(event: FormEvent) {
    event.preventDefault();
    if (!product) return;
    setSaving(true);
    setError('');
    setOk('');

    const selectedExtrasObj = availableExtras.filter((e) => selectedExtraIds.includes(e.id));
    const extrasSummary = selectedExtrasObj.length
      ? `Extras: ${selectedExtrasObj.map((e) => e.name).join(', ')}`
      : '';
    const finalNotes = [notes.trim(), extrasSummary].filter(Boolean).join(' | ');

    try {
      if (isCustomer()) {
        const token = getToken() ?? '';
        await api<Cart>('/cart/items', {
          method: 'POST',
          token,
          body: JSON.stringify({
            productId: product.id,
            quantity,
            notes: finalNotes,
            extraIds: selectedExtraIds,
          }),
        });
      } else {
        addGuestItem(product, quantity, finalNotes);
      }
      await refresh();
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
        <div className="detail-back-action">
          <Link to="/products" className="back-link">
            ← volvamos al menú
          </Link>
        </div>
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
      <div className="detail-back-action">
        <Link to="/products" className="back-link">
          ← volvamos al menú
        </Link>
      </div>

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

      <p className="price">
        {formatPrice(unitPriceWithExtras)}
        {extrasTotalPerUnit > 0 && (
          <small style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '0.5rem' }}>
            (base {formatPrice(product.price)} + {formatPrice(extrasTotalPerUnit)} extras)
          </small>
        )}
      </p>
      <p>{product.description}</p>

      <form className="card form" onSubmit={(event) => void addToCart(event)}>
        <h2>Agregar al carrito</h2>

        {/* Tarjetas de adicionales con recorte centrado */}
        {availableExtras.length > 0 && (
          <div className="extras-wrapper">
            <span className="extras-title">¿Querés sumarle algún adicional?</span>
            <div className="extras-grid">
              {availableExtras.map((extra) => {
                const isSelected = selectedExtraIds.includes(extra.id);
                const extraImg = extra.images?.[0]?.url || extra.imageUrl;

                return (
                  <div
                    key={extra.id}
                    role="button"
                    tabIndex={0}
                    className={`extra-card ${isSelected ? 'extra-card-selected' : ''}`}
                    onClick={() => handleToggleExtra(extra.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggleExtra(extra.id);
                      }
                    }}
                  >
                    <div className="extra-check">
                      {isSelected ? <span>✓</span> : null}
                    </div>

                    <div className="extra-thumb-box">
                      {extraImg ? (
                        <img
                          src={mediaUrl(extraImg)}
                          alt={extra.name}
                          className="extra-thumb"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="extra-thumb-placeholder" />
                      )}
                    </div>

                    <span className="extra-item-name">{extra.name}</span>
                    <span className="extra-item-price">+{formatPrice(extra.price)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
            <button
              type="button"
              className="secondary"
              onClick={() => setQuantity((current) => current + 1)}
              aria-label="Más"
            >
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
            {ok} <Link to="/products">Seguir comprando</Link> · <Link to="/cart">Ver carrito</Link>
          </p>
        ) : null}

        <button type="submit" disabled={saving}>
          {saving ? 'Agregando…' : `Agregar al carrito (${formatPrice(unitPriceWithExtras * quantity)})`}
        </button>
      </form>
    </article>
  );
}