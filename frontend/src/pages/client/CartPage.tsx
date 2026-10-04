import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../cart/CartContext';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import type { Cart, CartItem, Product } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { hydrateGuestCart, removeGuestItem, updateGuestItem } from '../../cart/guestCart';
import { mediaUrl } from '../../lib/media';
import { formatPrice } from '../../lib/money';

function parseNotesAndExtras(notesRaw?: string | null) {
  if (!notesRaw) return { extrasNames: [], kitchenNote: '' };

  const text = notesRaw.trim();
  
  // Soporta tanto "Extras: A, B | nota" como "nota | Extras: A, B"
  let extrasNames: string[] = [];
  let kitchenNote = text;

  const extrasMatch = text.match(/(?:^|[|;\n])\s*(?:extras?:?|con:?)\s*([^|;\n]+)/i);
  if (extrasMatch) {
    extrasNames = extrasMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    kitchenNote = text.replace(extrasMatch[0], '').replace(/^[|;\s]+|[|;\s]+$/g, '').trim();
  }

  return { extrasNames, kitchenNote };
}

export function CartPage() {
  const { refresh } = useCart();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [cart, setCart] = useState<Cart | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
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
        setCart(updateGuestItem(item.productId, quantity, notes));
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
        setCart(removeGuestItem(item.productId));
        void refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el ítem');
    } finally {
      setUpdatingId('');
    }
  }

  const items = cart?.items ?? [];

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Tu carrito</h1>
          <p className="muted">
            {loggedIn
              ? 'El total es precio × cantidad. El carrito queda guardado en tu cuenta.'
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
            {items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                allProducts={allProducts}
                busy={updatingId === item.id}
                onQuantity={(quantity) => void changeQuantity(item, quantity)}
                onNotes={(notes) => void saveItem(item, item.quantity, notes)}
                onRemove={() => void removeItem(item)}
              />
            ))}
          </ul>
          <div className="card total-card">
            <p className="total-row">
              <span>Total</span>
              <strong>{formatPrice(cart?.total ?? 0)}</strong>
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
  busy,
  onQuantity,
  onNotes,
  onRemove,
}: {
  item: CartItem & { extras?: Array<{ id: string; name: string; price: number; imageUrl?: string | null }> };
  allProducts: Product[];
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onNotes: (notes: string) => void;
  onRemove: () => void;
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
        {item.product.imageUrl ? (
          <img src={mediaUrl(item.product.imageUrl)} alt={item.product.name} />
        ) : (
          <div className="cart-item-photo" />
        )}

        <div className="cart-item-info">
          <strong>{item.product.name}</strong>
          <p className="muted">{formatPrice(item.unitPrice)} c/u</p>

          {/* Adicionales con miniaturas y precios */}
          {resolvedExtras.length > 0 && (
            <div
              className="cart-item-extras"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                margin: '0.35rem 0',
              }}
            >
              {resolvedExtras.map((extra, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <span style={{ color: '#fdba74', fontWeight: 700, userSelect: 'none' }}>
                    └
                  </span>
                  {extra.imageUrl ? (
                    <img
                      src={mediaUrl(extra.imageUrl)}
                      alt={extra.name}
                      style={{
                        width: '24px',
                        height: '24px',
                        objectFit: 'contain',
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        borderRadius: '6px',
                        padding: '2px',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                      }}
                    >
                      ✨
                    </span>
                  )}
                  <span style={{ fontWeight: 500, color: '#334155' }}>
                    {extra.name}
                  </span>
                  {extra.price ? (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 400 }}>
                      (+{formatPrice(extra.price)})
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}

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