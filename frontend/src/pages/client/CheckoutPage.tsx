import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApiError, api } from '../../api/client';
import type {
  Address,
  Cart,
  CheckoutBranchesResponse,
  Fulfillment,
  Order,
  PromotionQuote,
  OutOfCoverageError,
  OutOfStockError,
  OutOfStockItem,
} from '../../api/types';
import { useCart } from '../../cart/CartContext';
import { getToken, isCustomer } from '../../auth/session';
import { clearGuestCart, getGuestCart, hydrateGuestCart } from '../../cart/guestCart';
import { discountCaption } from '../../lib/discount-label';
import { formatDateTime, formatPrice } from '../../lib/money';
import { mediaUrl } from '../../lib/media';
import { AddressLocationPicker } from '../../components/AddressLocationPicker';

type GuestFormErrors = {
  name?: string;
  email?: string;
  street?: string;
  latitude?: string;
  longitude?: string;
};

function formatDistance(km: number): string {
  return `${km.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function formatUnits(count: number): string {
  return count === 1 ? '1 unidad' : `${count} unidades`;
}

function parseCoordinate(value: string, min: number, max: number): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function CheckoutPage() {
  const loggedIn = isCustomer();
  const token = getToken() ?? '';
  const { refresh } = useCart();
  const [cart, setCart] = useState<Cart | null>(null);
  const [quote, setQuote] = useState<PromotionQuote | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [fulfillment, setFulfillment] = useState<Fulfillment>('delivery');
  const [branchId, setBranchId] = useState('');
  const [branchOptions, setBranchOptions] = useState<CheckoutBranchesResponse | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [coverageError, setCoverageError] = useState<OutOfCoverageError | null>(null);
  const [stockError, setStockError] = useState<OutOfStockError | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
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

  // La misma regla que se aplica al confirmar: porcentual del pedido o 2x1 del producto.
  useEffect(() => {
    if (loading || !cart || cart.items.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    const body = loggedIn
      ? {}
      : {
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        };
    api<PromotionQuote>('/promotions/quote', { method: 'POST', token, body: JSON.stringify(body) })
      .then((next) => {
        if (!cancelled) setQuote(next);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [cart, loading, loggedIn, token]);

  // Sucursales para elegir: dependen de retiro/domicilio, de la ubicación y del carrito.
  useEffect(() => {
    if (loading || !cart || cart.items.length === 0) return;

    function reset() {
      setBranchOptions(null);
      setBranchesLoading(false);
    }

    const body: Record<string, unknown> = { fulfillment };
    if (loggedIn) {
      if (fulfillment === 'delivery') {
        if (!addressId) return reset();
        body.addressId = addressId;
      }
    } else {
      body.items = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      }));
      if (fulfillment === 'delivery') {
        const lat = parseCoordinate(latitude, -90, 90);
        const lng = parseCoordinate(longitude, -180, 180);
        if (lat === null || lng === null) return reset();
        body.latitude = lat;
        body.longitude = lng;
      }
    }

    let cancelled = false;
    setBranchesLoading(true);
    setBranchesError('');
    const timer = setTimeout(() => {
      api<CheckoutBranchesResponse>('/branches/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      })
        .then((result) => {
          if (!cancelled) setBranchOptions(result);
        })
        .catch((err) => {
          if (cancelled) return;
          setBranchOptions(null);
          setBranchesError(err instanceof Error ? err.message : 'No se pudieron cargar las sucursales');
        })
        .finally(() => {
          if (!cancelled) setBranchesLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loading, cart, loggedIn, token, fulfillment, addressId, latitude, longitude]);

  // Retiro: la primera sucursal con stock queda elegida. Domicilio: solo si hay una.
  useEffect(() => {
    if (!branchOptions) {
      setBranchId('');
      return;
    }
    setBranchId((current) => {
      if (branchOptions.branches.some((branch) => branch.id === current)) return current;
      if (branchOptions.branches.length === 1) return branchOptions.branches[0].id;
      if (branchOptions.fulfillment === 'pickup') {
        return (branchOptions.branches.find((branch) => branch.canFulfill) ?? branchOptions.branches[0])?.id ?? '';
      }
      return '';
    });
  }, [branchOptions]);

  useEffect(() => {
    if (coverageError || stockError) {
      noticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [coverageError, stockError]);

  function clearConfirmErrors() {
    setError('');
    setCoverageError(null);
    setStockError(null);
  }

  function changeFulfillment(next: Fulfillment) {
    setFulfillment(next);
    clearConfirmErrors();
  }

  function showConfirmError(err: unknown) {
    if (err instanceof ApiError && err.code === 'OUT_OF_COVERAGE') {
      setCoverageError(err.body as OutOfCoverageError);
    } else if (err instanceof ApiError && err.code === 'OUT_OF_STOCK') {
      setStockError(err.body as OutOfStockError);
    } else {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el pedido');
    }
  }

  async function confirmLoggedIn(event: FormEvent) {
    event.preventDefault();
    if (fulfillment === 'delivery' && !addressId) {
      setError('Elegí una dirección de entrega.');
      return;
    }
    if (!branchId) {
      setError('Elegí la sucursal.');
      return;
    }
    setSaving(true);
    clearConfirmErrors();
    try {
      const created = await api<Order>('/orders', {
        method: 'POST',
        token,
        body: JSON.stringify({
          fulfillment,
          branchId,
          ...(fulfillment === 'delivery' ? { addressId } : {}),
        }),
      });
      await refresh();
      setOrder(created);
    } catch (err) {
      showConfirmError(err);
    } finally {
      setSaving(false);
    }
  }

  function validateGuest(): boolean {
    const nextErrors: GuestFormErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

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

    if (fulfillment === 'delivery') {
      if (!street.trim()) {
        nextErrors.latitude = 'Marcá la ubicación: buscá la dirección o tocá el mapa.';
      }

      if (!latitude.trim()) {
        nextErrors.latitude = 'Ingresá la latitud.';
      } else if (parseCoordinate(latitude, -90, 90) === null) {
        nextErrors.latitude = 'Latitud inválida (-90 a 90).';
      }

      if (!longitude.trim()) {
        nextErrors.longitude = 'Ingresá la longitud.';
      } else if (parseCoordinate(longitude, -180, 180) === null) {
        nextErrors.longitude = 'Longitud inválida (-180 a 180).';
      }
    }

    setGuestErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function confirmGuest(event: FormEvent) {
    event.preventDefault();
    clearConfirmErrors();

    if (!validateGuest()) {
      return;
    }
    if (!branchId) {
      setError('Elegí la sucursal.');
      return;
    }

    const current = cart ?? getGuestCart();

    setSaving(true);
    try {
      const created = await api<Order>('/orders/guest', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          fulfillment,
          branchId,
          ...(fulfillment === 'delivery'
            ? {
                street: street.trim(),
                latitude: Number(latitude),
                longitude: Number(longitude),
              }
            : {}),
          items: current.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        }),
      });
      clearGuestCart();
      await refresh();
      setOrder(created);
    } catch (err) {
      showConfirmError(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Cargando…</p>;

  if (order) {
    return (
      <section className="stack checkout-page">
        <header className="page-head">
          <h1>Pedido confirmado</h1>
        </header>
        <div className="card form checkout order-confirmed">
          <div className="checkout-block">
            <div className="checkout-receive">
              <span className="badge badge--pending">Pendiente</span>
              <p className="muted">Quedó registrado. Te avisamos cuando avance.</p>
            </div>
          </div>

          <div className="checkout-block">
            <h2>Datos</h2>
            <dl className="order-confirmed-facts">
              <div className="is-wide">
                <dt>Código</dt>
                <dd className="order-id">{order.id}</dd>
              </div>
              {order.guestName ? (
                <div className="is-wide">
                  <dt>Cliente</dt>
                  <dd>
                    {order.guestName}
                    {order.guestEmail ? <span className="checkout-choice-meta"> · {order.guestEmail}</span> : null}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Sucursal</dt>
                <dd>{order.branch.name}</dd>
              </div>
              <div>
                <dt>{order.address ? 'Entrega' : 'Retiro'}</dt>
                <dd>
                  {order.address
                    ? `${order.address.alias?.trim() ? `${order.address.alias.trim()} · ` : ''}${order.address.street}`
                    : order.branch.address}
                </dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatDateTime(order.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="checkout-block">
            <h2>Resumen</h2>
            <ul className="order-items">
              {order.items.map((item) => {
                const itemTotal = item.subtotal ?? item.quantity * item.unitPrice;
                return (
                  <li key={item.id}>
                    <span className="checkout-line">
                      {item.product.imageUrl ? (
                        <img src={mediaUrl(item.product.imageUrl)} alt="" />
                      ) : (
                        <span className="checkout-line-photo" aria-hidden="true" />
                      )}
                      <span className="checkout-line-name">
                        <span className="checkout-qty">{item.quantity}</span>
                        {item.product.name}
                      </span>
                      <span className="checkout-line-price">{formatPrice(itemTotal)}</span>
                    </span>
                    {item.notes ? <small className="muted">{item.notes}</small> : null}
                  </li>
                );
              })}
            </ul>
            <PriceBreakdown
              subtotal={order.subtotal}
              discountAmount={order.discountAmount}
              totalAmount={order.totalAmount}
              promotionName={order.promotionName}
              promotionType={order.promotionType}
              promotionValue={order.promotionValue}
            />
            <p className="checkout-back">
              <Link to="/products">Seguir mirando el menú</Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!cart || cart.items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  // DEV-24: sin sucursales para elegir, no se puede confirmar y se explica por qué.
  let blockedReason = '';
  if (branchOptions && branchOptions.branches.length === 0) {
    blockedReason =
      fulfillment === 'delivery'
        ? `Ninguna sucursal llega a esta dirección (radio de ${branchOptions.radiusKm.toLocaleString('es-AR')} km). Elegí otra dirección o pedí para retirar.`
        : 'No hay sucursales activas en este momento.';
  }

  return (
    <section className="stack checkout-page">
      <header className="page-head">
        <h1>Confirmar pedido</h1>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {coverageError ? (
        <div className="checkout-notice" role="alert" ref={noticeRef}>
          <p>
            <strong>{coverageError.message}</strong>
          </p>
          <p className="muted">
            {loggedIn
              ? 'Elegí otra dirección de entrega o revisá cuáles tienen cobertura.'
              : 'Revisá la dirección y las coordenadas, o mirá qué sucursales llegan a tu zona.'}
          </p>
          <p className="checkout-notice-links">
            <Link to="/branches">Ver sucursales disponibles</Link>
            {loggedIn ? <Link to="/account/addresses">Mis direcciones</Link> : null}
          </p>
        </div>
      ) : null}

      {stockError ? (
        <div className="checkout-notice" role="alert" ref={noticeRef}>
          <p>
            <strong>{stockError.message}</strong>
          </p>
          <ul className="checkout-notice-list">
            {stockError.items.map((item) => (
              <li key={item.productId}>
                {item.name}: pediste {formatUnits(item.requested)},{' '}
                {item.available > 0 ? `quedan ${formatUnits(item.available)}` : 'no queda stock'}
              </li>
            ))}
          </ul>
          <p className="muted">Ajustá las cantidades en el carrito o elegí otra sucursal.</p>
          <p className="checkout-notice-links">
            <Link to="/cart">Ajustar carrito</Link>
          </p>
        </div>
      ) : null}

      {loggedIn ? (
        <form className="card form checkout" onSubmit={(event) => void confirmLoggedIn(event)} noValidate>
          <FulfillmentToggle
            value={fulfillment}
            onChange={changeFulfillment}
            hint="Elegí si lo retirás o te lo llevamos, y desde qué sucursal."
          />

          {fulfillment === 'delivery' ? (
            <div className="checkout-block">
              {addresses.length === 0 ? (
                <p className="empty">
                  Necesitás una dirección de entrega. <Link to="/account/addresses">Cargá una acá</Link> o
                  pedí para retirar.
                </p>
              ) : (
                <>
                  <h2>Dirección de entrega</h2>
                  {addresses.map((address) => (
                    <label key={address.id} className="checkbox address-choice">
                      <input
                        type="radio"
                        name="addressId"
                        checked={addressId === address.id}
                        onChange={() => {
                          setAddressId(address.id);
                          clearConfirmErrors();
                        }}
                      />
                      <span className="checkout-choice">
                        <span className="checkout-choice-title">
                          {address.alias?.trim() || address.street}
                          {address.isDefault ? <span className="checkout-pill">Principal</span> : null}
                        </span>
                        {address.alias?.trim() ? (
                          <span className="checkout-choice-meta">{address.street}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </>
              )}
            </div>
          ) : null}

          <div className="checkout-block">
            <BranchPicker
              options={branchOptions}
              loading={branchesLoading}
              error={branchesError}
              branchId={branchId}
              onChange={(id) => {
                setBranchId(id);
                clearConfirmErrors();
              }}
              hint=""
              blockedReason={blockedReason}
            />
          </div>
          <div className="checkout-block">
          <OrderSummary
            cart={cart}
            quote={quote}
            saving={saving}
            shortages={stockError?.items ?? []}
            blockedReason={blockedReason}
          />
          </div>
        </form>
      ) : (
        <form className="card form checkout" onSubmit={(event) => void confirmGuest(event)} noValidate>
          <FulfillmentToggle
            value={fulfillment}
            onChange={changeFulfillment}
            hint="No hace falta cuenta. Completá tus datos y elegí cómo recibir tu pedido."
          />

          <div className="checkout-block">
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

          </div>

          {fulfillment === 'delivery' ? (
            <div className="checkout-block">
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
              <AddressLocationPicker
                street={street}
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setGuestErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
                }}
                locateOnMount={false}
                disabled={saving}
              />
              {guestErrors.latitude || guestErrors.longitude ? (
                <small className="error" role="alert">
                  {guestErrors.latitude ?? guestErrors.longitude}
                </small>
              ) : null}
            </div>
          ) : null}

          <div className="checkout-block">
            <BranchPicker
              options={branchOptions}
              loading={branchesLoading}
              error={branchesError}
              branchId={branchId}
              onChange={(id) => {
                setBranchId(id);
                clearConfirmErrors();
              }}
              hint={
                fulfillment === 'delivery'
                  ? 'Completá latitud y longitud para ver qué sucursales llegan a tu dirección.'
                  : ''
              }
              blockedReason={blockedReason}
            />
          </div>
          <div className="checkout-block">
            <OrderSummary
              cart={cart}
              quote={quote}
              saving={saving}
              shortages={stockError?.items ?? []}
              blockedReason={blockedReason}
            />
          </div>
        </form>
      )}
    </section>
  );
}

function FulfillmentToggle({
  value,
  onChange,
  hint,
}: {
  value: Fulfillment;
  onChange: (next: Fulfillment) => void;
  hint: string;
}) {
  return (
    <div className="checkout-block">
      <div className="checkout-receive">
        <h2>¿Cómo lo querés recibir?</h2>
        <p className="muted">{hint}</p>
      </div>
      <div className="filters">
        <button
          type="button"
          className={value === 'delivery' ? 'chip chip-active' : 'chip'}
          onClick={() => onChange('delivery')}
        >
          A domicilio
        </button>
        <button
          type="button"
          className={value === 'pickup' ? 'chip chip-active' : 'chip'}
          onClick={() => onChange('pickup')}
        >
          Retiro en sucursal
        </button>
      </div>
    </div>
  );
}

function BranchPicker({
  options,
  loading,
  error,
  branchId,
  onChange,
  hint,
  blockedReason,
}: {
  options: CheckoutBranchesResponse | null;
  loading: boolean;
  error: string;
  branchId: string;
  onChange: (id: string) => void;
  hint: string;
  blockedReason: string;
}) {
  return (
    <fieldset className="tag-fieldset">
      <legend>Sucursal</legend>
      {loading ? <p className="muted">Buscando sucursales…</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {!options && !loading && !error && hint ? <p className="field-hint">{hint}</p> : null}
      {!loading && !error && options && options.branches.length === 0 && blockedReason ? (
        <p className="checkout-empty" role="status">
          {blockedReason}
        </p>
      ) : null}
      {options?.branches.map((branch) => (
        <label key={branch.id} className="checkbox address-choice">
          <input
            type="radio"
            name="branchId"
            checked={branchId === branch.id}
            onChange={() => onChange(branch.id)}
          />
          <span className="checkout-choice">
            <span className="checkout-choice-title">
              {branch.name}
              {branch.distanceKm !== null ? (
                <span className="checkout-choice-meta">{formatDistance(branch.distanceKm)}</span>
              ) : null}
            </span>
            <span className="checkout-choice-meta">{branch.address}</span>
            {branch.canFulfill ? (
              <small className="branch-stock branch-stock--ok">Tiene stock de todo tu pedido</small>
            ) : (
              <small className="branch-stock branch-stock--short">
                Sin stock suficiente de: {branch.missing.map((item) => item.name).join(', ')}
              </small>
            )}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function PriceBreakdown({
  subtotal,
  discountAmount,
  totalAmount,
  promotionName,
  promotionType,
  promotionValue,
}: {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  promotionName?: string | null;
  promotionType?: 'percent' | 'two_for_one' | null;
  promotionValue?: number | null;
}) {
  const caption = discountCaption({ name: promotionName, type: promotionType, value: promotionValue });
  if (!discountAmount) {
    return (
      <p className="total-row">
        <span>Total</span>
        <strong>{formatPrice(totalAmount)}</strong>
      </p>
    );
  }
  return (
    <>
      <p className="total-row total-row--detail">
        <span>Subtotal</span>
        <strong>{formatPrice(subtotal)}</strong>
      </p>
      <p className="total-row total-row--detail">
        <span>Descuento{caption ? ` (${caption})` : ''}</span>
        <strong>−{formatPrice(discountAmount)}</strong>
      </p>
      <p className="total-row">
        <span>Total</span>
        <strong>{formatPrice(totalAmount)}</strong>
      </p>
    </>
  );
}

function OrderSummary({
  cart,
  quote,
  saving,
  shortages,
  blockedReason,
}: {
  cart: Cart;
  quote: PromotionQuote | null;
  saving: boolean;
  shortages: OutOfStockItem[];
  blockedReason: string;
}) {
  return (
    <>
      <h2>Resumen</h2>
      <ul className="order-items">
        {cart.items.map((item) => {
          const shortage = shortages.find((entry) => entry.productId === item.productId);
          return (
            <li key={item.id} className={shortage ? 'order-item--short' : undefined}>
              <span className="checkout-line">
                {item.product.imageUrl ? (
                  <img src={mediaUrl(item.product.imageUrl)} alt="" />
                ) : (
                  <span className="checkout-line-photo" aria-hidden="true" />
                )}
                <span className="checkout-line-name">
                  <span className="checkout-qty">{item.quantity}</span>
                  {item.product.name}
                </span>
                <span className="checkout-line-price">{formatPrice(item.subtotal)}</span>
              </span>
              {item.notes ? <small className="muted">{item.notes}</small> : null}
              {shortage ? (
                <small className="order-item-shortage">
                  {shortage.available > 0
                    ? `Sin stock suficiente: quedan ${formatUnits(shortage.available)}`
                    : 'Sin stock en esta sucursal'}
                </small>
              ) : null}
            </li>
          );
        })}
      </ul>
      <PriceBreakdown
        subtotal={quote?.subtotal ?? cart.total}
        discountAmount={quote?.discountAmount ?? 0}
        totalAmount={quote?.totalAmount ?? cart.total}
        promotionName={quote?.promotion?.name}
        promotionType={quote?.promotion?.type}
        promotionValue={quote?.promotion?.value}
      />
      <button type="submit" disabled={saving || Boolean(blockedReason)}>
        {saving ? 'Confirmando…' : 'Confirmar pedido'}
      </button>
      <p className="checkout-back">
        <Link to="/cart">Volver al carrito</Link>
      </p>
    </>
  );
}