import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Address, Cart, Order } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { clearGuestCart, getGuestCart, hydrateGuestCart } from '../../cart/guestCart';
import { formatDateTime, formatPrice } from '../../lib/money';

export function CheckoutPage() {
  const loggedIn = isCustomer();
  const token = getToken() ?? '';
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
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
        if (loggedIn) {
          const [nextCart, nextAddresses] = await Promise.all([
            api<Cart>('/cart', { token }),
            api<Address[]>('/me/addresses', { token }),
          ]);
          if (cancelled) return;
          setCart(nextCart);
          setAddresses(nextAddresses);
          const preferred = nextAddresses.find((address) => address.isDefault) ?? nextAddresses[0];
          setAddressId(preferred?.id ?? '');
        } else {
          const nextCart = await hydrateGuestCart();
          if (!cancelled) setCart(nextCart);
        }
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
  }, [loggedIn, token]);

  async function confirmLoggedIn(event: FormEvent) {
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

  async function confirmGuest(event: FormEvent) {
    event.preventDefault();
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!name.trim()) {
      setError('Completá tu nombre.');
      return;
    }
    if (!email.trim()) {
      setError('Completá tu email.');
      return;
    }
    if (!street.trim()) {
      setError('Completá la dirección.');
      return;
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError('Latitud inválida (-90 a 90).');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError('Longitud inválida (-180 a 180).');
      return;
    }

    const current = cart ?? getGuestCart();
    setSaving(true);
    setError('');
    try {
      const created = await api<Order>('/orders/guest', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          street: street.trim(),
          latitude: lat,
          longitude: lng,
          items: current.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        }),
      });
      clearGuestCart();
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
          {order.guestName ? (
            <p>
              <strong>Cliente:</strong> {order.guestName}
              {order.guestEmail ? ` · ${order.guestEmail}` : ''}
            </p>
          ) : null}
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
          <p className="muted">
            {loggedIn
              ? 'Se asigna la sucursal activa más cercana a tu dirección.'
              : 'No hace falta cuenta. Completá tus datos y la dirección de entrega.'}
          </p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {loggedIn && addresses.length === 0 ? (
        <p className="empty">
          Necesitás una dirección de entrega. <Link to="/account/addresses">Cargá una acá</Link>.
        </p>
      ) : null}

      {loggedIn && addresses.length > 0 ? (
        <form className="card form" onSubmit={(event) => void confirmLoggedIn(event)}>
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
          <OrderSummary cart={cart} saving={saving} />
        </form>
      ) : null}

      {!loggedIn ? (
        <form className="card form" onSubmit={(event) => void confirmGuest(event)}>
          <h2>Tus datos</h2>
          <label>
            Nombre
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <h2>Dirección de entrega</h2>
          <label>
            Dirección
            <input
              value={street}
              onChange={(event) => setStreet(event.target.value)}
              required
              maxLength={200}
              placeholder="Av. Rivadavia 5000, CABA"
            />
          </label>
          <div className="row">
            <label>
              Latitud
              <input
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                required
                inputMode="decimal"
                placeholder="-34.6037"
              />
            </label>
            <label>
              Longitud
              <input
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                required
                inputMode="decimal"
                placeholder="-58.3816"
              />
            </label>
          </div>
          <p className="field-hint">En este sprint latitud y longitud se cargan a mano. Sin mapa.</p>
          <OrderSummary cart={cart} saving={saving} />
        </form>
      ) : null}
    </section>
  );
}

function OrderSummary({ cart, saving }: { cart: Cart; saving: boolean }) {
  return (
    <>
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
    </>
  );
}
