import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../cart/CartContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Cart, CartItem, Product, PromotionQuote } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { addGuestItem, clearGuestCart, getGuestCart, guestOrderItem, hydrateGuestCart, removeGuestExtra, removeGuestItem, updateGuestItem } from '../../cart/guestCart';
import { LineExtras } from '../../components/LineExtras';
import { PromoBanner } from '../../components/PromoBanner';
import { PromotionOffers } from '../../components/PromotionOffers';
import { NeedMealModal, SaucePickerModal } from '../../components/SauceModals';
import { parseNotesAndExtras } from '../../lib/cart-notes';
import { mediaUrl } from '../../lib/media';
import { appliedClaimCouponId, readClaimCouponId, saveClaimCouponId } from '../../lib/claim-coupon';
import { formatPrice } from '../../lib/money';
import { CART_DISABLED_MESSAGE, guestCartBlocked, type StockReleaseNotice } from '../../lib/cart-block';
import { countMeals, isSauceProduct, sauceOverLimitLabel, withSaucesLast } from '../../lib/sauces';
import { useAutoClear } from '../../lib/useAutoClear';

export function CartPage() {
  const loggedIn = isCustomer();
  const { refresh } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
 const [notice, setNotice] = useState(
    (location.state as { notice?: string } | null)?.notice ?? '',
  );
  useAutoClear(notice, () => setNotice(''));  const [cart, setCart] = useState<Cart | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [quote, setQuote] = useState<PromotionQuote | null>(null);
  const [couponId, setCouponId] = useState<string | null>(() => (loggedIn ? readClaimCouponId() : null));
  const [quoteSettled, setQuoteSettled] = useState(false);
  const [saucePickerOpen, setSaucePickerOpen] = useState(false);
  const [needMealOpen, setNeedMealOpen] = useState(false);
  const [sauceBusy, setSauceBusy] = useState(false);
  const [sauceError, setSauceError] = useState('');
  const [resetting, setResetting] = useState(false);
  const releasesRef = useRef<StockReleaseNotice[]>([]);

  function showCart(next: Cart): Cart {
    if (loggedIn) return next;
    return { ...next, purchaseBlocked: guestCartBlocked(next.items, releasesRef.current) };
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [cartData, productsData, releases] = await Promise.all([
        loggedIn
          ? api<Cart>('/cart', { token: getToken() ?? '' })
          : hydrateGuestCart(),
        api<Product[]>('/products').catch(() => []),
        loggedIn
          ? Promise.resolve([] as StockReleaseNotice[])
          : api<StockReleaseNotice[]>('/stock/releases').catch(() => [] as StockReleaseNotice[]),
      ]);
      releasesRef.current = releases;
      setCart(loggedIn ? cartData : showCart(cartData));
      setAllProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el carrito');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  useEffect(() => {
    if (!cart) return;
    if (cart.items.length === 0) {
      setQuote(null);
      setQuoteSettled(true);
      return;
    }
    let cancelled = false;
    setQuoteSettled(false);
    const body: Record<string, unknown> = loggedIn
      ? {}
      : {
          items: cart.items.map(guestOrderItem),
        };
    if (loggedIn && couponId) body.couponIncidentId = couponId;
    api<PromotionQuote>('/promotions/quote', {
      method: 'POST',
      token: getToken() ?? '',
      body: JSON.stringify(body),
    })
      .then((next) => {
        if (cancelled) return;
        setQuote(next);
        const appliedId = appliedClaimCouponId(next.offers);
        setCouponId((current) => {
          if (appliedId === current) return current;
          saveClaimCouponId(appliedId);
          return appliedId;
        });
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setQuoteSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cart, loggedIn, couponId]);

  async function saveItem(item: CartItem, quantity: number, notes: string) {
    setUpdatingId(item.id);
    setError('');
    try {
      if (loggedIn) {
        const next = await api<Cart>(`/cart/items/${item.id}`, {
          method: 'PATCH',
          token: getToken() ?? '',
          body: JSON.stringify({ quantity, notes }),
        });
        setCart(next);
        void refresh();
      } else {
        setCart(showCart(updateGuestItem(item.id, quantity, notes)));
        void refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el ítem');
    } finally {
      setUpdatingId('');
    }
  }

  async function changeQuantity(item: CartItem, quantity: number) {
    if (quantity < 1) {
      await removeItem(item);
      return;
    }
    await saveItem(item, quantity, item.notes);
  }

  async function removeExtra(item: CartItem, extraId: string) {
    setUpdatingId(item.id);
    setError('');
    try {
      if (loggedIn) {
        const next = await api<Cart>(`/cart/items/${item.id}/extras/${extraId}`, {
          method: 'DELETE',
          token: getToken() ?? '',
        });
        setCart(next);
      } else {
        setCart(showCart(removeGuestExtra(item.id, extraId)));
      }
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el adicional');
    } finally {
      setUpdatingId('');
    }
  }

  async function removeItem(item: CartItem) {
    setUpdatingId(item.id);
    setError('');
    try {
      if (loggedIn) {
        const next = await api<Cart>(`/cart/items/${item.id}`, {
          method: 'DELETE',
          token: getToken() ?? '',
        });
        setCart(next);
        void refresh();
      } else {
        setCart(showCart(removeGuestItem(item.id)));
        void refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el ítem');
    } finally {
      setUpdatingId('');
    }
  }

  const items = withSaucesLast(cart?.items ?? [], allProducts);
  const meals = countMeals(items, allProducts);
  const sauceProducts = allProducts
    .filter((product) => isSauceProduct(product))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  const saucesOverLimit = Object.values(meals.sauceQtyByProductId).some((quantity) => quantity > meals.maxPerSauce);
  const offers = quote?.offers ?? [];
  // Si ya listamos las ofertas arriba, no repetimos el descuento en el resumen.
  const showDiscountRow = Boolean(quote && quote.discountAmount > 0 && offers.length === 0);

  const showBanner = !loading && quoteSettled && !quote?.promotion;

  function goCheckout() {
    navigate('/checkout');
  }

  async function restartCart() {
    setResetting(true);
    setError('');
    try {
      if (loggedIn) {
        setCart(await api<Cart>('/cart', { method: 'DELETE', token: getToken() ?? '' }));
      } else {
        clearGuestCart();
        setCart(showCart(getGuestCart()));
      }
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vaciar el carrito');
    } finally {
      setResetting(false);
    }
  }

  function handleConfirm() {
    if (cart?.purchaseBlocked || saucesOverLimit) return;
    if (meals.maxPerSauce > 0 && meals.sauces === 0) {
      setSauceError('');
      setSaucePickerOpen(true);
      return;
    }
    goCheckout();
  }

  async function addSelectedSauces(quantities: Record<string, number>) {
    const picks = sauceProducts
      .map((product) => ({ product, quantity: quantities[product.id] ?? 0 }))
      .filter((pick) => pick.quantity > 0);
    if (picks.length === 0) {
      setSaucePickerOpen(false);
      goCheckout();
      return;
    }
    if (picks.some((pick) => pick.quantity > meals.maxPerSauce)) {
      setSauceError(
        meals.maxPerSauce === 1
          ? 'De cada aderezo podés agregar hasta 1.'
          : `De cada aderezo podés agregar hasta ${meals.maxPerSauce}.`,
      );
      return;
    }

    setSauceBusy(true);
    setSauceError('');
    try {
      if (loggedIn) {
        let next = cart;
        for (const pick of picks) {
          next = await api<Cart>('/cart/items', {
            method: 'POST',
            token: getToken() ?? '',
            body: JSON.stringify({ productId: pick.product.id, quantity: pick.quantity, notes: '' }),
          });
        }
        if (next) setCart(next);
      } else {
        let next = cart;
        for (const pick of picks) {
          next = addGuestItem(pick.product, pick.quantity, '');
        }
        if (next) setCart(showCart(next));
      }
      void refresh();
      setSaucePickerOpen(false);
      goCheckout();
    } catch (err) {
      setSauceError(err instanceof Error ? err.message : 'No se pudieron agregar los aderezos');
    } finally {
      setSauceBusy(false);
    }
  }

  return (
    <section className="stack">
      {showBanner ? <PromoBanner /> : null}
      <header className="page-head">
        <div>
          <h1>Tu carrito</h1>
          <p className="muted">
            {loggedIn
              ? 'El total ya descuenta la promo vigente. El carrito queda guardado en tu cuenta.'
              : 'Podés armar el pedido sin cuenta. El carrito queda en este dispositivo.'}
          </p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="warning" role="status">
          {notice}
        </p>
      ) : null}
      {loading ? <p className="muted">Cargando…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="empty">
          Todavía no hay nada. <Link to="/products">Mirá el menú</Link> y agregá algo.
        </p>
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <ul className="cart-list">
            {items.map((item) => {
              const catalogProduct = allProducts.find((product) => product.id === item.productId);
              const sauceLine = catalogProduct ? isSauceProduct(catalogProduct) : false;
              const productQty = items
                .filter((line) => line.productId === item.productId)
                .reduce((sum, line) => sum + line.quantity, 0);
              const pairHint =
                Boolean(catalogProduct?.twoForOne) &&
                productQty % 2 === 1 &&
                items.find((line) => line.productId === item.productId)?.id === item.id;
              return (
                <CartLine
                  key={item.id}
                  item={item}
                  allProducts={allProducts}
                  pairHint={pairHint}
                  busy={updatingId === item.id}
                  increaseDisabled={sauceLine && meals.maxPerSauce > 0 && productQty >= meals.maxPerSauce}
                  onQuantity={(quantity) => {
                    if (quantity > item.quantity && sauceLine && meals.maxPerSauce === 0) {
                      setNeedMealOpen(true);
                      return;
                    }
                    void changeQuantity(item, quantity);
                  }}
                  onNotes={(notes) => void saveItem(item, item.quantity, notes)}
                  onRemove={() => void removeItem(item)}
                  onRemoveExtra={(extraId) => void removeExtra(item, extraId)}
                />
              );
            })}
          </ul>
          <div className="card total-card">
            <PromotionOffers
              offers={offers}
              selectedCouponId={couponId}
              onSelectCoupon={
                loggedIn
                  ? (id) => {
                      saveClaimCouponId(id);
                      setCouponId(id);
                    }
                  : undefined
              }
            />
            {quote && quote.discountAmount > 0 ? (
              <>
                <p className="total-row total-row--detail">
                  <span>Subtotal</span>
                  <strong>{formatPrice(quote.subtotal)}</strong>
                </p>
                {showDiscountRow ? (
                  <p className="total-row total-row--detail">
                    <span>Descuento</span>
                    <strong>−{formatPrice(quote.discountAmount)}</strong>
                  </p>
                ) : null}
              </>
            ) : null}
            <p className="total-row">
              <span>Total</span>
              <strong>{formatPrice(quote?.totalAmount ?? cart?.total ?? 0)}</strong>
            </p>
            {cart?.purchaseBlocked ? (
              <p className="warning" role="status">
                {CART_DISABLED_MESSAGE}
              </p>
            ) : null}
            {saucesOverLimit ? (
              <p className="warning" role="status">
                {meals.maxPerSauce === 0
                  ? 'Los aderezos van con las hamburguesas y las guarniciones. Sumá alguna o quitalos para continuar.'
                  : `De cada aderezo podés tener hasta ${meals.maxPerSauce}. ${sauceOverLimitLabel(meals, allProducts)}`}
              </p>
            ) : null}
            {cart?.purchaseBlocked ? (
              <button type="button" className="secondary" disabled={resetting} onClick={() => void restartCart()}>
                {resetting ? 'Vaciando…' : 'Vaciar y armar de nuevo'}
              </button>
            ) : null}
            <button
              type="button"
              className="checkout-button"
              disabled={saucesOverLimit || Boolean(cart?.purchaseBlocked) || resetting}
              onClick={handleConfirm}
            >
              Ir a confirmar el pedido
            </button>
          </div>
        </>
      ) : null}

      {saucePickerOpen ? (
        <SaucePickerModal
          sauces={sauceProducts}
          maxPerSauce={meals.maxPerSauce}
          busy={sauceBusy}
          error={sauceError}
          onConfirm={(quantities) => void addSelectedSauces(quantities)}
          onSkip={() => {
            setSaucePickerOpen(false);
            goCheckout();
          }}
          onClose={() => {
            if (!sauceBusy) setSaucePickerOpen(false);
          }}
        />
      ) : null}
      {needMealOpen ? (
        <NeedMealModal onMenu={() => navigate('/products')} onClose={() => setNeedMealOpen(false)} />
      ) : null}
    </section>
  );
}

function CartLine({
  item,
  allProducts,
  pairHint,
  busy,
  increaseDisabled = false,
  onQuantity,
  onNotes,
  onRemove,
  onRemoveExtra,
}: {
  item: CartItem;
  allProducts: Product[];
  pairHint: boolean;
  busy: boolean;
  increaseDisabled?: boolean;
  onQuantity: (quantity: number) => void;
  onNotes: (notes: string) => void;
  onRemove: () => void;
  onRemoveExtra: (extraId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const skipSave = useRef(false);

  const parsed = parseNotesAndExtras(item.notes);

  // Cruzamos información con allProducts para encontrar la imagen real (imageUrl o images[0].url)
  const resolvedExtras = item.extras && item.extras.length > 0
    ? item.extras.map((e) => {
        const matched = allProducts.find(
          (p) =>
            p.id === e.id ||
            p.name.toLowerCase().trim() === e.name.toLowerCase().trim()
        );
        const img = e.imageUrl || matched?.imageUrl || matched?.images?.[0]?.url;
        return {
          id: e.id,
          name: e.name,
          price: e.price,
          imageUrl: img,
        };
      })
    : parsed.extrasNames.map((name) => {
        const matched = allProducts.find(
          (p) =>
            p.name.toLowerCase().trim() === name.toLowerCase().trim() ||
            name.toLowerCase().includes(p.name.toLowerCase().trim())
        );
        const img = matched?.imageUrl || matched?.images?.[0]?.url;
        return {
          name,
          price: matched?.price,
          imageUrl: img,
        };
      });

  const kitchenNote = parsed.kitchenNote;
  const [draftNote, setDraftNote] = useState(kitchenNote);

  function close(nextDraftNote: string) {
    const cleaned = nextDraftNote.trim();
    setOpen(false);
    setDraftNote(cleaned);

    let finalNotes = '';
    if (parsed.extrasNames.length > 0) {
      finalNotes = `Extras: ${parsed.extrasNames.join(', ')}`;
      if (cleaned) {
        finalNotes += ` | ${cleaned}`;
      }
    } else {
      finalNotes = cleaned;
    }

    if (finalNotes !== item.notes) {
      onNotes(finalNotes);
    }
  }

  return (
    <li className="card cart-item">
      <div className="cart-item-row">
        <Link to={`/products/${item.product.id}`} className="cart-item-photo-link">
          {item.product.imageUrl ? (
            <img src={mediaUrl(item.product.imageUrl)} alt="" />
          ) : (
            <div className="cart-item-photo" />
          )}
        </Link>

        <div className="cart-item-info">
          <Link to={`/products/${item.product.id}`} className="cart-item-name">
            {item.product.name}
          </Link>
          <p className="muted">{formatPrice(item.unitPrice)} c/u</p>

          {/* Aclaración exclusiva para cocina */}
          {kitchenNote && !open ? (
            <button
              type="button"
              className="cart-notes-line"
              disabled={busy}
              style={{ marginTop: '0.25rem' }}
              onClick={() => {
                setDraftNote(kitchenNote);
                setOpen(true);
              }}
            >
              <PencilIcon />
              <span>Aclaración: "{kitchenNote}"</span>
            </button>
          ) : null}

          {!kitchenNote && !open ? (
            <button
              type="button"
              className="cart-notes-line"
              disabled={busy}
              style={{
                marginTop: '0.25rem',
                color: '#94a3b8',
                fontSize: '0.8rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: 0,
              }}
              onClick={() => {
                setDraftNote('');
                setOpen(true);
              }}
            >
              <PencilIcon />
              <span>Agregar aclaración para la cocina</span>
            </button>
          ) : null}
        </div>

        <div className="cart-item-side">
          <div className="cart-qty">
            <button
              type="button"
              disabled={busy}
              onClick={() => onQuantity(item.quantity - 1)}
              aria-label="Menos"
            >
              −
            </button>
            <span>{item.quantity}</span>
            <button
              type="button"
              disabled={busy || increaseDisabled}
              onClick={() => onQuantity(item.quantity + 1)}
              aria-label="Más"
            >
              +
            </button>
          </div>
          <strong className="cart-item-subtotal">{formatPrice(item.subtotal)}</strong>
          <button
            type="button"
            className="cart-icon cart-icon--danger"
            disabled={busy}
            onClick={onRemove}
            aria-label="Quitar"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {pairHint ? (
        <p className="cart-pair-hint">Si sumás una más, esa sale gratis.</p>
      ) : null}

      <LineExtras
        className="cart-line-extras"
        extras={resolvedExtras}
        busy={busy}
        onRemove={(extra) => {
          if (extra.id) onRemoveExtra(extra.id);
        }}
      />

      {open ? (
        <div style={{ marginTop: '0.5rem' }}>
          <textarea
            className="cart-notes-input"
            value={draftNote}
            maxLength={200}
            rows={2}
            autoFocus
            disabled={busy}
            aria-label="Aclaración de cocina"
            placeholder="Aclaraciones para la cocina (ej: sin sal, sin cebolla). No agregues ingredientes con costo."
            onChange={(event) => setDraftNote(event.target.value)}
            onBlur={(event) => {
              if (skipSave.current) {
                skipSave.current = false;
                setDraftNote(kitchenNote);
                setOpen(false);
                return;
              }
              close(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                skipSave.current = true;
                event.currentTarget.blur();
              }
            }}
          />
          <small style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
            Presioná fuera para guardar (o Esc para cancelar)
          </small>
        </div>
      ) : null}
    </li>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}