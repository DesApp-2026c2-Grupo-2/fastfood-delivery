import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Cart, CartItem } from '../../api/types';
import { getToken } from '../../auth/session';
import { mediaUrl } from '../../lib/media';
import { formatPrice } from '../../lib/money';

export function CartPage() {
  const token = getToken() ?? '';
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setCart(await api<Cart>('/cart', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el carrito');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveItem(item: CartItem, quantity: number, notes: string) {
    setUpdatingId(item.id);
    setError('');
    try {
      const next = await api<Cart>(`/cart/items/${item.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ quantity, notes }),
      });
      setCart(next);
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
      const next = await api<Cart>(`/cart/items/${item.id}`, { method: 'DELETE', token });
      setCart(next);
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
          <p className="muted">El total es precio × cantidad. El carrito queda guardado en tu cuenta.</p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
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
              <li key={item.id} className="card cart-item">
                <div className="cart-item-main">
                  {item.product.imageUrl ? (
                    <img src={mediaUrl(item.product.imageUrl)} alt="" />
                  ) : (
                    <div className="cart-item-photo" />
                  )}
                  <div>
                    <strong>{item.product.name}</strong>
                    <p className="muted">
                      {formatPrice(item.unitPrice)} · subtotal {formatPrice(item.subtotal)}
                    </p>
                  </div>
                </div>
                <label>
                  Cantidad
                  <div className="qty">
                    <button
                      type="button"
                      className="secondary"
                      disabled={updatingId === item.id}
                      onClick={() => void changeQuantity(item, item.quantity - 1)}
                      aria-label="Menos"
                    >
                      −
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      type="button"
                      className="secondary"
                      disabled={updatingId === item.id}
                      onClick={() => void changeQuantity(item, item.quantity + 1)}
                      aria-label="Más"
                    >
                      +
                    </button>
                  </div>
                </label>
                <label>
                  Observaciones
                  <textarea
                    defaultValue={item.notes}
                    maxLength={300}
                    rows={2}
                    disabled={updatingId === item.id}
                    onBlur={(event) => {
                      const notes = event.target.value.trim();
                      if (notes !== item.notes) void saveItem(item, item.quantity, notes);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="danger"
                  disabled={updatingId === item.id}
                  onClick={() => void removeItem(item)}
                >
                  Quitar
                </button>
              </li>
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
