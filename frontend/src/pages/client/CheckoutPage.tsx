import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Address, Cart, Order } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { clearGuestCart, getGuestCart, hydrateGuestCart } from '../../cart/guestCart';
import { formatDateTime, formatPrice } from '../../lib/money';

type GuestFormErrors = {
  name?: string;
  email?: string;
  street?: string;
  latitude?: string;
  longitude?: string;
};

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
  const [guestErrors, setGuestErrors] = useState<GuestFormErrors>({});
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

  function validateGuest(): boolean {
    const nextErrors: GuestFormErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedStreet = street.trim();
    const trimmedLat = latitude.trim();
    const trimmedLng = longitude.trim();

    if (!trimmedName) {
      nextErrors.name = 'Completá tu nombre.';
    } else if (trimmedName.length < 2) {
      nextErrors.name = 'El nombre debe tener al menos 2 caracteres.';
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Completá tu email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'El formato del email no es válido.';
    }

    if (!trimmedStreet) {
      nextErrors.street = 'Completá la dirección de entrega.';
    }

    if (!trimmedLat) {
      nextErrors.latitude = 'Ingresá la latitud.';
    } else {
      const lat = Number(trimmedLat);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        nextErrors.latitude = 'Latitud inválida (-90 a 90).';
      }
    }

    if (!trimmedLng) {
      nextErrors.longitude = 'Ingresá la longitud.';
    } else {
      const lng = Number(trimmedLng);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        nextErrors.longitude = 'Longitud inválida (-180 a 180).';
      }
    }

    setGuestErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function confirmGuest(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!validateGuest()) {
      return;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const current = cart ?? getGuestCart();

    setSaving(true);
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
        <form className="card form" onSubmit={(event) => void confirmLoggedIn(event)} noValidate>
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
        <form className="card form" onSubmit={(event) => void confirmGuest(event)} noValidate>
          <h2>Tus datos</h2>
          <label>
            Nombre
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (guestErrors.name) setGuestErrors((prev) => ({ ...prev, name: undefined }));
              }}
              maxLength={80}
            />
            {guestErrors.name ? (
              <small className="error" role="alert">
                {guestErrors.name}
              </small>
            ) : null}
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (guestErrors.email) setGuestErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
            {guestErrors.email ? (
              <small className="error" role="alert">
                {guestErrors.email}
              </small>
            ) : null}
          </label>

          <h2>Dirección de entrega</h2>
          <label>
            Dirección
            <input
              value={street}
              onChange={(event) => {
                setStreet(event.target.value);
                if (guestErrors.street) setGuestErrors((prev) => ({ ...prev, street: undefined }));
              }}
              maxLength={200}
              placeholder="Av. Rivadavia 5000, CABA"
            />
            {guestErrors.street ? (
              <small className="error" role="alert">
                {guestErrors.street}
              </small>
            ) : null}
          </label>

          <div className="row">
            <label>
              Latitud
              <input
                value={latitude}
                onChange={(event) => {
                  setLatitude(event.target.value);
                  if (guestErrors.latitude) setGuestErrors((prev) => ({ ...prev, latitude: undefined }));
                }}
                inputMode="decimal"
                placeholder="-34.6037"
              />
              {guestErrors.latitude ? (
                <small className="error" role="alert">
                  {guestErrors.latitude}
                </small>
              ) : null}
            </label>
            <label>
              Longitud
              <input
                value={longitude}
                onChange={(event) => {
                  setLongitude(event.target.value);
                  if (guestErrors.longitude) setGuestErrors((prev) => ({ ...prev, longitude: undefined }));
                }}
                inputMode="decimal"
                placeholder="-58.3816"
              />
              {guestErrors.longitude ? (
                <small className="error" role="alert">
                  {guestErrors.longitude}
                </small>
              ) : null}
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