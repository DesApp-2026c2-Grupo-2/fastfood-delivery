import { useCart } from '../../cart/CartContext';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Cart, Product, ProductExtraOption, PromotionQuote } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { addGuestItem, getGuestCart } from '../../cart/guestCart';
import { NeedMealModal } from '../../components/SauceModals';
import { ProductTags, PromoBadge } from '../../components/ProductTags';
import { PromoBanner } from '../../components/PromoBanner';
import { mediaUrl } from '../../lib/media';
import { discountCaption } from '../../lib/discount-label';
import { formatPrice } from '../../lib/money';
import { countMeals, isSauceProduct, type MealCounts } from '../../lib/sauces';

// Mientras llega la cotización nueva, se estima con la promo que ya se mostró.
// Si no, el descuento se va a 0 y el subtotal aparece y desaparece en cada clic.
function previewDiscount(quote: PromotionQuote, listTotal: number, quantity: number, unitPrice: number): number {
  const promotion = quote.promotion;
  if (!promotion || quote.discountAmount <= 0 || listTotal <= 0) return 0;
  if (promotion.type === 'two_for_one') {
    const freeUnits = Math.floor(quantity / 2);
    return Math.min(Math.round(freeUnits * unitPrice * 100) / 100, listTotal);
  }
  return Math.min(Math.round(listTotal * promotion.value) / 100, listTotal);
}

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [availableExtras, setAvailableExtras] = useState<ProductExtraOption[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [pairLeft, setPairLeft] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [lineQuote, setLineQuote] = useState<{
    key: string;
    quote: PromotionQuote;
  } | null>(null);
  const [mealCounts, setMealCounts] = useState<MealCounts | null>(null);
  const [limitsError, setLimitsError] = useState('');
  const [needMeal, setNeedMeal] = useState(false);

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
          // HU-30: el API ya trae los adicionales que el admin marcó en este producto (y están disponibles).
          setAvailableExtras(data.extras ?? []);
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

  const sauceProduct = Boolean(product && isSauceProduct(product));

  useEffect(() => {
    if (!product || !isSauceProduct(product)) {
      setMealCounts(null);
      setLimitsError('');
      return;
    }
    let cancelled = false;
    setLimitsError('');
    async function loadLimits() {
      try {
        const [cartData, products] = await Promise.all([
          isCustomer() ? api<Cart>('/cart', { token: getToken() ?? '' }) : Promise.resolve(getGuestCart()),
          api<Product[]>('/products'),
        ]);
        if (!cancelled) setMealCounts(countMeals(cartData.items, products));
      } catch (err) {
        if (!cancelled) {
          setMealCounts(null);
          setLimitsError(err instanceof Error ? err.message : 'No se pudo revisar el carrito');
        }
      }
    }
    void loadLimits();
    return () => {
      cancelled = true;
    };
  }, [product, ok]);

  const extraKey = [...selectedExtraIds].sort().join(',');

  // La misma promo que el pedido: 2x1 de este producto o el porcentaje del total.
  useEffect(() => {
    if (!product) {
      setLineQuote(null);
      return;
    }
    const key = `${product.id}:${quantity}:${extraKey}`;
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
  }, [product, quantity, extraKey]);

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
  const quoteKey = product ? `${product.id}:${quantity}:${extraKey}` : '';
  const freshQuote = lineQuote?.key === quoteKey ? lineQuote.quote : null;
  const carriedQuote =
    !freshQuote && lineQuote && product && lineQuote.key.startsWith(`${product.id}:`) ? lineQuote.quote : null;
  const shownQuote = freshQuote ?? carriedQuote;
  const lineDiscount = freshQuote
    ? freshQuote.discountAmount
    : carriedQuote
      ? previewDiscount(carriedQuote, listTotal, quantity, product ? Number(product.price) : 0)
      : 0;
  const payable = freshQuote
    ? freshQuote.totalAmount
    : Math.round((listTotal - lineDiscount) * 100) / 100;
  const promoCaption = discountCaption({
    id: shownQuote?.promotion?.id,
    name: shownQuote?.promotion?.name,
    type: shownQuote?.promotion?.type,
    value: shownQuote?.promotion?.value,
  });
  const oneShort = Boolean(product?.twoForOne) && quantity % 2 === 1;

  const sauceInCart = product && mealCounts ? mealCounts.sauceQtyByProductId[product.id] ?? 0 : 0;
  const sauceRemaining = mealCounts ? Math.max(0, mealCounts.maxPerSauce - sauceInCart) : null;

  function setSauceAwareQuantity(next: number) {
    const safe = Math.max(1, next);
    if (sauceProduct && mealCounts && mealCounts.maxPerSauce > 0) {
      setQuantity(Math.min(safe, Math.max(1, sauceRemaining ?? 1)));
      return;
    }
    setQuantity(safe);
  }

  async function addToCart(event?: FormEvent, quantityOverride?: number) {
    event?.preventDefault();
    if (!product) return;
    const nextQuantity = quantityOverride ?? quantity;

    if (isSauceProduct(product)) {
      if (!mealCounts) return;
      if (mealCounts.maxPerSauce === 0) {
        setNeedMeal(true);
        return;
      }
      if (sauceInCart + nextQuantity > mealCounts.maxPerSauce) {
        setError(
          mealCounts.maxPerSauce === 1
            ? 'De este aderezo podés agregar hasta 1.'
            : `De este aderezo podés agregar hasta ${mealCounts.maxPerSauce}.`,
        );
        return;
      }
    }

    setSaving(true);
    setError('');
    setOk('');
    setPairLeft(false);

    // DEV-17: Las observaciones de cocina van limpias, sin mezclar con los nombres de los extras
    const cleanNotes = notes.trim();

    try {
      const saved = isCustomer()
        ? await api<Cart>('/cart/items', {
            method: 'POST',
            token: getToken() ?? '',
            body: JSON.stringify({
              productId: product.id,
              quantity: nextQuantity,
              notes: cleanNotes, // Enviamos solo la aclaración real
              extraIds: selectedExtraIds,
            }),
          })
        : addGuestItem(
            product,
            nextQuantity,
            cleanNotes,
            availableExtras
              .filter((extra) => selectedExtraIds.includes(extra.id))
              .map((extra) => ({
                id: extra.id,
                name: extra.name,
                price: Number(extra.price) || 0,
                imageUrl: extra.imageUrl,
              })),
          );
      const inCart = saved.items
        .filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      await refresh();
      setPairLeft(Boolean(product.twoForOne) && inCart % 2 === 1);
      setOk(
        nextQuantity === 1
          ? '¡Sumamos 1 unidad al carrito!'
          : `¡Sumamos ${nextQuantity} unidades al carrito!`,
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

      <PromoBanner />

      <div className="detail-top">
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

        <div className="detail-info">
          <h1>{product.name}</h1>
          {product.twoForOne ? (
            <p className="promo-note">
              Llevá dos y una sale gratis.
              {availableExtras.length > 0 ? ' Los adicionales se cobran.' : ''}
            </p>
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
        </div>
      </div>

      <form className="card form" onSubmit={(event) => void addToCart(event)}>
        <h2>Agregar al carrito</h2>

        {sauceProduct ? (
          <p className="muted">
            {!mealCounts
              ? limitsError || 'Revisando el pedido…'
              : mealCounts.maxPerSauce === 0
                ? 'Para sumar aderezos, primero agregá las hamburguesas y las guarniciones.'
                : `De cada aderezo podés sumar hasta ${mealCounts.maxPerSauce}. De este ya hay ${sauceInCart} en el carrito.`}
          </p>
        ) : null}

        {/* Tarjetas de adicionales */}
        {availableExtras.length > 0 && (
          <div className="extras-wrapper">
            <span className="extras-title">¿Querés sumarle algún adicional?</span>
            <div className="extras-grid">
              {availableExtras.map((extra) => {
                const isSelected = selectedExtraIds.includes(extra.id);
                const extraImg = extra.imageUrl;

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

        <div className="product-buy">
        {oneShort && !ok ? (
          <p className="pair-hint" role="status">
            <span>
              Si sumás una más, esa sale gratis.
              {selectedExtraIds.length > 0 ? ' Los adicionales sí se cobran.' : ''}
            </span>
            <button type="button" className="text-action" onClick={() => setQuantity((current) => current + 1)}>
              Sumar la que sale gratis
            </button>
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
              onClick={() => setSauceAwareQuantity(quantity - 1)}
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
                setSauceAwareQuantity(val ? parseInt(val, 10) : 1);
              }}
              aria-label="Cantidad"
              className="qty-input"
            />
            <button
              type="button"
              className="qty-btn"
              disabled={Boolean(sauceProduct && mealCounts && mealCounts.maxPerSauce > 0 && quantity >= (sauceRemaining ?? 0))}
              onClick={() => setSauceAwareQuantity(quantity + 1)}
              aria-label="Más"
            >
              +
            </button>
          </div>

          <button
            type="submit"
            className="add-to-cart-submit"
            disabled={saving || (sauceProduct && !mealCounts) || Boolean(sauceProduct && mealCounts && mealCounts.maxPerSauce > 0 && sauceRemaining === 0)}
          >
            <span>{saving ? 'Agregando…' : 'Agregar al carrito'}</span>
            <span className="add-to-cart-price">{formatPrice(payable)}</span>
          </button>
        </div>
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
            {pairLeft ? (
              <p className="pair-hint-follow">
                Aprovechá el 2x1: si agregás una más, esa no tiene costo.
                {selectedExtraIds.length > 0 ? ' Los adicionales sí se cobran.' : ''}
              </p>
            ) : null}

            <div className="cart-added-actions">
              {pairLeft ? (
                <button
                  type="button"
                  className="cart-added-go"
                  disabled={saving}
                  onClick={() => void addToCart(undefined, 1)}
                >
                  Agregar la que sale gratis
                </button>
              ) : null}
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

      {needMeal ? (
        <NeedMealModal
          onMenu={() => navigate('/products')}
          onClose={() => setNeedMeal(false)}
        />
      ) : null}
    </article>
  );
}