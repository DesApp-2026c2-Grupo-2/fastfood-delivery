import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Address, Cart, Order } from '../../api/types';
import { getToken } from '../../auth/session';
import { formatDateTime, formatPrice } from '../../lib/money';

export function CheckoutPage() {
  const token = getToken() ?? '';
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [nextCart, nextAddresses] = await Promise.all([
          api<Cart>('/cart', { token }),
          api<Address[]>('/me/addresses', { token }),
        ]);
        if (cancelled) return;
        setCart(nextCart);
        setAddresses(nextAddresses);
        const preferred = nextAddresses.find((address) => address.isDefault) ?? nextAddresses[0];
        setAddressId(preferred?.id ?? '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el checkout');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!addressId) {
      setError('Elegí una dirección de entrega.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await api<Order>('/orders', {
        method: 'POST',
        token,
        body: JSON.stringify({ addressId }),
      });
      setOrder(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el pedido');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Cargando…</p>;

  if (order) {
    return (
      <section className="stack">
        <header className="page-head">
          <div>
            <h1>Pedido confirmado</h1>
            <p className="muted">Quedó registrado en el sistema.</p>
          </div>
        </header>
        <div className="card form">
          <p>
            <span className="badge">Pendiente</span>
          </p>
          <p className="muted">
            Código <span className="order-id">{order.id}</span>
          </p>
          <p>
            <strong>Sucursal:</strong> {order.branch.name}
          </p>
          <p>
            <strong>Entrega:</strong> {order.address.street}
          </p>
          <p>
            <strong>Fecha:</strong> {formatDateTime(order.createdAt)}
          </p>
          <ul className="order-items">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.quantity} × {item.product.name} — {formatPrice(item.subtotal)}
                {item.notes ? <small className="muted"> ({item.notes})</small> : null}
              </li>
            ))}
          </ul>
          <p className="total-row">
            <span>Importe</span>
            <strong>{formatPrice(order.totalAmount)}</strong>
          </p>
        </div>
        <p>
          <Link to="/products">Seguir mirando el menú</Link>
        </p>
      </section>
    );
  }

  if (!cart || cart.items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Confirmar pedido</h1>
          <p className="muted">Se asigna la sucursal activa más cercana a tu dirección.</p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {addresses.length === 0 ? (
        <p className="empty">
          Necesitás una dirección de entrega. <Link to="/account/addresses">Cargá una acá</Link>.
        </p>
      ) : (
        <form className="card form" onSubmit={(event) => void confirm(event)}>
          <h2>Dirección de entrega</h2>
          {addresses.map((address) => (
            <label key={address.id} className="checkbox address-choice">
              <input
                type="radio"
                name="addressId"
                checked={addressId === address.id}
                onChange={() => setAddressId(address.id)}
              />
              <span>
                {address.street}
                {address.isDefault ? <small className="muted"> · principal</small> : null}
              </span>
            </label>
          ))}

          <h2>Resumen</h2>
          <ul className="order-items">
            {cart.items.map((item) => (
              <li key={item.id}>
                {item.quantity} × {item.product.name} — {formatPrice(item.subtotal)}
                {item.notes ? <small className="muted"> ({item.notes})</small> : null}
              </li>
            ))}
          </ul>
          <p className="total-row">
            <span>Total</span>
            <strong>{formatPrice(cart.total)}</strong>
          </p>
          <button type="submit" disabled={saving}>
            {saving ? 'Confirmando…' : 'Confirmar pedido'}
          </button>
          <p>
            <Link to="/cart">Volver al carrito</Link>
          </p>
        </form>
      )}
    </section>
  );
}
