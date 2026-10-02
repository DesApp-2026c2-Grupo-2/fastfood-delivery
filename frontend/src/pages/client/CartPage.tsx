import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../cart/CartContext';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import type { Cart, CartItem } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { hydrateGuestCart, removeGuestItem, updateGuestItem } from '../../cart/guestCart';
import { mediaUrl } from '../../lib/media';
import { formatPrice } from '../../lib/money';

export function CartPage() {
  const { refresh } = useCart();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const loggedIn = isCustomer();

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (loggedIn) {
        setCart(await api<Cart>('/cart', { token: getToken() ?? '' }));
      } else {
        setCart(await hydrateGuestCart());
      }
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
  busy,
  onQuantity,
  onNotes,
  onRemove,
}: {
  item: CartItem;
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onNotes: (notes: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(item.notes);
  const skipSave = useRef(false);

  function close(nextDraft: string) {
    const notes = nextDraft.trim();
    setOpen(false);
    setDraft(notes);
    if (notes !== item.notes) onNotes(notes);
  }

  return (
    <li className="card cart-item">
      <div className="cart-item-row">
        {item.product.imageUrl ? (
          <img src={mediaUrl(item.product.imageUrl)} alt="" />
        ) : (
          <div className="cart-item-photo" />
        )}
        <div className="cart-item-info">
          <strong>{item.product.name}</strong>
          <p className="muted">{formatPrice(item.unitPrice)} c/u</p>
          {item.notes && !open ? (
            <button
              type="button"
              className="cart-notes-line"
              disabled={busy}
              onClick={() => {
                setDraft(item.notes);
                setOpen(true);
              }}
            >
              <PencilIcon />
              <span>{item.notes}</span>
            </button>
          ) : null}
          {!item.notes && !open ? (
            <button
              type="button"
              className="cart-icon"
              disabled={busy}
              aria-label="Agregar observaciones"
              onClick={() => {
                setDraft('');
                setOpen(true);
              }}
            >
              <PencilIcon />
            </button>
          ) : null}
        </div>
        <div className="cart-item-side">
          <div className="cart-qty">
            <button type="button" disabled={busy} onClick={() => onQuantity(item.quantity - 1)} aria-label="Menos">
              −
            </button>
            <span>{item.quantity}</span>
            <button type="button" disabled={busy} onClick={() => onQuantity(item.quantity + 1)} aria-label="Más">
              +
            </button>
          </div>
          <strong className="cart-item-subtotal">{formatPrice(item.subtotal)}</strong>
          <button type="button" className="cart-icon cart-icon--danger" disabled={busy} onClick={onRemove} aria-label="Quitar">
            <TrashIcon />
          </button>
        </div>
      </div>
      {open ? (
        <textarea
          className="cart-notes-input"
          value={draft}
          maxLength={300}
          rows={2}
          autoFocus
          disabled={busy}
          aria-label="Observaciones"
          placeholder="Sin cebolla, punto de cocción, etc."
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => {
            if (skipSave.current) {
              skipSave.current = false;
              setDraft(item.notes);
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