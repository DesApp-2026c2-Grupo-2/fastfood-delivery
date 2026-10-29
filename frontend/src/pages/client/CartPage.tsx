import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../cart/CartContext';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import type { Cart, CartItem, Product, PromotionQuote } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { guestOrderItem, hydrateGuestCart, removeGuestExtra, removeGuestItem, updateGuestItem } from '../../cart/guestCart';
import { LineExtras } from '../../components/LineExtras';
import { PromoBanner } from '../../components/PromoBanner';
import { PromotionOffers } from '../../components/PromotionOffers';
import { parseNotesAndExtras } from '../../lib/cart-notes';
import { mediaUrl } from '../../lib/media';
import { formatPrice } from '../../lib/money';
import { useAutoClear } from '../../lib/useAutoClear';

export function CartPage() {
  const { refresh } = useCart();
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
  const [quoteSettled, setQuoteSettled] = useState(false);
  const loggedIn = isCustomer();

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [cartData, productsData] = await Promise.all([
        loggedIn
          ? api<Cart>('/cart', { token: getToken() ?? '' })
          : hydrateGuestCart(),
        api<Product[]>('/products').catch(() => []),
      ]);
      setCart(cartData);
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
    const body = loggedIn
      ? {}
      : {
          items: cart.items.map(guestOrderItem),
        };
    api<PromotionQuote>('/promotions/quote', {
      method: 'POST',
      token: getToken() ?? '',
      body: JSON.stringify(body),
    })
      .then((next) => {
        if (!cancelled) setQuote(next);
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
  }, [cart, loggedIn]);

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
        setCart(updateGuestItem(item.id, quantity, notes));
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
        setCart(removeGuestExtra(item.id, extraId));
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
        setCart(removeGuestItem(item.id));
        void refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el ítem');
    } finally {
      setUpdatingId('');
    }
  }

  const items = cart?.items ?? [];
  const offers = quote?.offers ?? [];
  // Si ya listamos las ofertas arriba, no repetimos el descuento en el resumen.
  const showDiscountRow = Boolean(quote && quote.discountAmount > 0 && offers.length === 0);

  const showBanner = !loading && quoteSettled && !quote?.promotion;

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
                  onQuantity={(quantity) => void changeQuantity(item, quantity)}
                  onNotes={(notes) => void saveItem(item, item.quantity, notes)}
                  onRemove={() => void removeItem(item)}
                  onRemoveExtra={(extraId) => void removeExtra(item, extraId)}
                />
              );
            })}
          </ul>
          <div className="card total-card">
            <PromotionOffers offers={offers} />
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
            <Link className="checkout-button" to="/checkout">
              Ir a confirmar el pedido
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}

function CartLine({
  item,
  allProducts,
  pairHint,
  busy,
  onQuantity,
  onNotes,
  onRemove,
  onRemoveExtra,
}: {
  item: CartItem;
  allProducts: Product[];
  pairHint: boolean;
  busy: boolean;
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
              disabled={busy}
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