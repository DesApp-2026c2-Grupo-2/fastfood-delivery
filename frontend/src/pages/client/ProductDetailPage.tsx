import { useCart } from '../../cart/CartContext';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Cart, Product, PromotionQuote } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { addGuestItem } from '../../cart/guestCart';
import { ProductTags, PromoBadge } from '../../components/ProductTags';
import { mediaUrl } from '../../lib/media';
import { discountCaption } from '../../lib/discount-label';
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
  const [notesOpen, setNotesOpen] = useState(false);
  const [lineQuote, setLineQuote] = useState<{
    key: string;
    quote: PromotionQuote;
  } | null>(null);

  // Referencia para hacer scroll al mensaje de confirmación
  const successRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ok && successRef.current) {
      successRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [ok]);

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

  // La misma promo que el pedido: 2x1 de este producto o el porcentaje del total.
  useEffect(() => {
    if (!product) {
      setLineQuote(null);
      return;
    }
    const key = `${product.id}:${quantity}:${selectedExtraIds.join(',')}`;
    let cancelled = false;
    const timer = setTimeout(() => {
      api<PromotionQuote>('/promotions/quote', {
        method: 'POST',
        token: getToken() ?? '',
        body: JSON.stringify({
          items: [{ productId: product.id, quantity, extraIds: selectedExtraIds }],
        }),
      })
        .then((next) => {
          if (!cancelled) setLineQuote({ key, quote: next });
        })
        .catch(() => {
          if (!cancelled) setLineQuote(null);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // selectedExtraIds se resume en extraKey para no disparar el efecto en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, quantity, selectedExtraIds.join(',')]);

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
  const listTotal = unitPriceWithExtras * quantity;
  const quoteKey = product ? `${product.id}:${quantity}:${selectedExtraIds.join(',')}` : '';
  const matchedQuote = lineQuote?.key === quoteKey ? lineQuote.quote : null;
  const lineDiscount = matchedQuote?.discountAmount ?? 0;
  const payable = lineDiscount > 0 ? matchedQuote!.totalAmount : listTotal;
  const promoCaption = discountCaption({
    name: matchedQuote?.promotion?.name,
    type: matchedQuote?.promotion?.type,
    value: matchedQuote?.promotion?.value,
  });

  async function addToCart(event: FormEvent) {
    event.preventDefault();
    if (!product) return;
    setSaving(true);
    setError('');
    setOk('');

    // DEV-17: Las observaciones de cocina van limpias, sin mezclar con los nombres de los extras
    const cleanNotes = notes.trim();

    try {
      if (isCustomer()) {
        const token = getToken() ?? '';
        await api<Cart>('/cart/items', {
          method: 'POST',
          token,
          body: JSON.stringify({
            productId: product.id,
            quantity,
            notes: cleanNotes, // Enviamos solo la aclaración real
            extraIds: selectedExtraIds,
          }),
        });
      } else {
        // Para invitados, le pasamos las notas limpias
        addGuestItem(product, quantity, cleanNotes);
      }
      await refresh();
      setOk(
        quantity === 1
          ? '¡Sumamos 1 unidad al carrito!'
          : `¡Sumamos ${quantity} unidades al carrito!`,
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
        <div className="detail-photo">
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
          {product.twoForOne ? <PromoBadge /> : null}
        </div>
      ) : product.twoForOne ? (
        <PromoBadge />
      ) : null}

      <h1>{product.name}</h1>
      {product.twoForOne ? (
        <p className="promo-note">Llevá dos y una sale gratis. Los adicionales se cobran.</p>
      ) : null}
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

        {/* Tarjetas de adicionales */}
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

        {notesOpen ? (
          <label>
            Observaciones
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={300}
              rows={2}
              autoFocus
              placeholder="Sin cebolla, punto de cocción, etc."
            />
          </label>
        ) : (
          <button
            type="button"
            className="text-action"
            onClick={() => setNotesOpen(true)}
            style={{ alignSelf: 'flex-start', margin: '0.25rem 0' }}
          >
            + Agregar observaciones
          </button>
        )}

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {lineDiscount > 0 ? (
          <div className="product-line-discount">
            <p>
              <span>Subtotal</span>
              <strong>{formatPrice(listTotal)}</strong>
            </p>
            <p>
              <span>Descuento{promoCaption ? ` (${promoCaption})` : ''}</span>
              <strong>−{formatPrice(lineDiscount)}</strong>
            </p>
          </div>
        ) : null}

        {/* Fila principal integrada: Selector + Botón de acción con subtotal */}
        <div className="product-action-footer">
          <div className="qty" aria-label="Cantidad">
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              aria-label="Menos"
            >
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={quantity}
              onChange={(event) => {
                const val = event.target.value.replace(/\D/g, '');
                setQuantity(val ? Math.max(1, parseInt(val, 10)) : 1);
              }}
              aria-label="Cantidad"
              className="qty-input"
            />
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQuantity((current) => current + 1)}
              aria-label="Más"
            >
              +
            </button>
          </div>

          <button type="submit" className="add-to-cart-submit" disabled={saving}>
            <span>{saving ? 'Agregando…' : 'Agregar al carrito'}</span>
            <span className="add-to-cart-price">{formatPrice(payable)}</span>
          </button>
        </div>

        {/* Notificación de éxito con scroll automático */}
        {ok ? (
          <div
            ref={successRef}
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              marginTop: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>
                {ok}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.5rem',
              }}
            >
              <Link to="/products" className="cart-added-stay">
                Seguir comprando
              </Link>
              <Link to="/cart" className="cart-added-go">
                Ver carrito →
              </Link>
            </div>
          </div>
        ) : null}
      </form>
    </article>
  );
}