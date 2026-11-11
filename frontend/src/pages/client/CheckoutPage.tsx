import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../../api/client';
import { isStatusBehind, useOrderStatusEvents } from '../../api/order-events';
import type {
  Address,
  Cart,
  CheckoutBranchesResponse,
  FreeDeliveryProgress,
  Fulfillment,
  Order,
  Product,
  PromotionQuote,
  OutOfCoverageError,
  OutOfStockError,
  OutOfStockItem,
  OrderDiscountLine,
} from '../../api/types';
import { useCart } from '../../cart/CartContext';
import { getToken, getUserId, isCustomer } from '../../auth/session';
import { clearGuestCart, getGuestCart, guestOrderItem, hydrateGuestCart } from '../../cart/guestCart';
import { CART_DISABLED_MESSAGE, guestCartBlocked, type StockReleaseNotice } from '../../lib/cart-block';
import { LineExtras } from '../../components/LineExtras';
import { PromotionOffers } from '../../components/PromotionOffers';
import { LoyaltyStampsCard } from '../../components/LoyaltyStampsCard';
import { parseNotesAndExtras } from '../../lib/cart-notes';
import { withSaucesLast } from '../../lib/sauces';
import { appliedClaimCouponId, readClaimCouponId, saveClaimCouponId } from '../../lib/claim-coupon';
import { discountCaption, orderDiscountLabel } from '../../lib/discount-label';
import { formatDateTime, formatPrice } from '../../lib/money';
import { nextOpenPhrase, openStatusLabel } from '../../lib/branch-status';
import { mediaUrl } from '../../lib/media';
import { orderStatusHint, orderStatusLabel, showPickupBadge } from '../../lib/order-status';
import { AddressFields } from '../../components/AddressFields';
import { AddressLocationPicker } from '../../components/AddressLocationPicker';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  type AddressParts,
  addressPartsError,
  emptyAddressParts,
  formatAddress,
  formatBranchAddress,
  normalizePostalCode,
} from '../../lib/address';
import { PaymentMethodPicker } from '../../components/PaymentMethodPicker';
import { paymentLabel, type PaymentMethod } from '../../lib/payment';
import { TransferInfo } from '../../components/TransferInfo';

type GuestFormErrors = {
  name?: string;
  email?: string;
  address?: string;
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


function confirmedKey(orderId: string) {
  return `mordi.confirmed-order.${orderId}`;
}

function readConfirmed(orderId: string): { order: Order; paymentMethod: PaymentMethod } | null {
  try {
    const raw = sessionStorage.getItem(confirmedKey(orderId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { order?: Order; paymentMethod?: PaymentMethod };
    if (!parsed.order || parsed.order.id !== orderId) return null;
    return { order: parsed.order, paymentMethod: parsed.paymentMethod ?? 'cash' };
  } catch {
    return null;
  }
}

function rememberConfirmed(order: Order, paymentMethod: PaymentMethod) {
  sessionStorage.setItem(confirmedKey(order.id), JSON.stringify({ order, paymentMethod }));
}

function withExtraImages(order: Order, products: Product[]): Order {
  if (products.length === 0) return order;
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      extras: (item.extras ?? []).map((extra) => {
        const matched = products.find(
          (product) =>
            product.id === extra.id ||
            product.name.toLowerCase().trim() === extra.name.toLowerCase().trim(),
        );
        return {
          ...extra,
          imageUrl: extra.imageUrl || matched?.imageUrl || matched?.images?.[0]?.url || null,
        };
      }),
    })),
  };
}

export function CheckoutPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const savedConfirmation = orderId ? readConfirmed(orderId) : null;
  const loggedIn = isCustomer();
  const token = getToken() ?? '';
  const userId = getUserId();
  const { refresh } = useCart();
  const [cart, setCart] = useState<Cart | null>(null);
  const [quote, setQuote] = useState<PromotionQuote | null>(null);
  const [couponId, setCouponId] = useState<string | null>(() => (loggedIn ? readClaimCouponId() : null));
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [guestAddress, setGuestAddress] = useState<AddressParts>(emptyAddressParts);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [fulfillment, setFulfillment] = useState<Fulfillment>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(savedConfirmation?.paymentMethod ?? 'cash');
  const [branchId, setBranchId] = useState('');
  const [branchOptions, setBranchOptions] = useState<CheckoutBranchesResponse | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState('');
  const [order, setOrder] = useState<Order | null>(savedConfirmation?.order ?? null);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [orderError, setOrderError] = useState('');
  const [error, setError] = useState('');
  const [coverageError, setCoverageError] = useState<OutOfCoverageError | null>(null);
  const [stockError, setStockError] = useState<OutOfStockError | null>(null);
  const [closedAsk, setClosedAsk] = useState<string | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const pinnedBranch = useRef<{ scope: string; id: string } | null>(null);
  const fulfillmentPinned = useRef<Fulfillment | null>(null);
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
          const [nextCart, releases] = await Promise.all([
            hydrateGuestCart(),
            api<StockReleaseNotice[]>('/stock/releases').catch(() => [] as StockReleaseNotice[]),
          ]);
          if (!cancelled) {
            setCart({ ...nextCart, purchaseBlocked: guestCartBlocked(nextCart.items, releases) });
          }
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

  useEffect(() => {
    if (!orderId) return;
    const id = orderId;
    let cancelled = false;

    async function loadConfirmed() {
      const saved = readConfirmed(id);
      try {
        if (isCustomer()) {
          const fresh = await api<Order>(`/orders/${id}`, { token: getToken() ?? '', cache: 'no-store' });
          if (cancelled) return;
          const next = { ...fresh, loyalty: fresh.loyalty ?? saved?.order.loyalty };
          setOrder((current) => ({ ...next, loyalty: next.loyalty ?? current?.loyalty }));
          rememberConfirmed(next, saved?.paymentMethod ?? 'cash');
          return;
        }
        if (!saved) {
          if (!cancelled) setOrderError('No encontramos este pedido en este dispositivo.');
          return;
        }
        const status = await api<{ status: string }>(`/orders/${id}/status`);
        if (cancelled) return;
        setOrder((current) => {
          const base = current ?? saved.order;
          if (isStatusBehind(status.status, base.status)) return base;
          return { ...base, status: status.status };
        });
      } catch (err) {
        if (cancelled || saved) return;
        setOrderError(err instanceof Error ? err.message : 'No se pudo cargar el pedido');
      }
    }

    void loadConfirmed();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const orderTerminal = order?.status === 'delivered' || order?.status === 'cancelled';

  useEffect(() => {
    if (!orderId || orderTerminal) return;
    const id = orderId;
    const interval = setInterval(() => {
      if (isCustomer()) {
        void api<Order>(`/orders/${id}`, { token: getToken() ?? '', cache: 'no-store' })
          .then((fresh) => {
            setOrder((current) => {
              if (!current || isStatusBehind(fresh.status, current.status)) return current;
              return { ...fresh, loyalty: fresh.loyalty ?? current.loyalty };
            });
          })
          .catch(() => {
            /* el próximo intento vuelve a pedir el estado */
          });
        return;
      }
      void api<{ status: string }>(`/orders/${id}/status`, { cache: 'no-store' })
        .then((fresh) => {
          setOrder((current) => {
            if (!current || isStatusBehind(fresh.status, current.status)) return current;
            return { ...current, status: fresh.status };
          });
        })
        .catch(() => {
          /* el próximo intento vuelve a pedir el estado */
        });
    }, 3000);
    return () => clearInterval(interval);
  }, [orderId, orderTerminal]);

  useOrderStatusEvents(token, userId, (event) => {
    if (!orderId || event.orderId !== orderId) return;
    setOrder((current) => {
      if (!current || isStatusBehind(event.status, current.status)) return current;
      return { ...current, status: event.status };
    });
  });

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    api<Product[]>('/products')
      .then((products) => {
        if (!cancelled) setCatalog(products);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.id]);

  // La misma regla que se aplica al confirmar: porcentual del pedido o 2x1 del producto.
  useEffect(() => {
    if (loading || !cart || cart.items.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    const body: Record<string, unknown> = loggedIn
      ? {}
      : {
          items: cart.items.map(guestOrderItem),
        };
    if (loggedIn && couponId) body.couponIncidentId = couponId;
    api<PromotionQuote>('/promotions/quote', { method: 'POST', token, body: JSON.stringify(body) })
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
      });
    return () => {
      cancelled = true;
    };
  }, [cart, loading, loggedIn, token, couponId]);

  // Sucursales para elegir: dependen de retiro/domicilio, de la ubicación y del carrito.
  useEffect(() => {
    if (loading || !cart || cart.items.length === 0) return;

    function reset() {
      setBranchOptions(null);
      setBranchesLoading(false);
    }

    const body: Record<string, unknown> = { fulfillment };
    if (loggedIn && couponId) body.couponIncidentId = couponId;
    if (loggedIn) {
      if (fulfillment === 'delivery') {
        if (!addressId) return reset();
        body.addressId = addressId;
      }
    } else {
      body.items = cart.items.map(guestOrderItem);
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
          if (cancelled) return;
          setBranchOptions(result);
          if (
            result.fulfillment === 'delivery' &&
            result.branches.length === 0 &&
            fulfillmentPinned.current !== 'delivery'
          ) {
            setFulfillment('pickup');
          }
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
  }, [loading, cart, loggedIn, token, fulfillment, addressId, latitude, longitude, couponId]);

  function branchScope() {
    if (fulfillment === 'pickup') return 'pickup';
    return loggedIn ? `delivery:${addressId}` : `delivery:${latitude}:${longitude}`;
  }

  function selectBranch(id: string) {
    pinnedBranch.current = { scope: branchScope(), id };
    setBranchId(id);
    clearConfirmErrors();
  }

  // La lista ya viene con stock completo primero y, dentro de ese grupo, de la más cercana a la más lejana.
  useEffect(() => {
    if (!branchOptions) {
      setBranchId('');
      return;
    }
    const scope = fulfillment === 'pickup' ? 'pickup' : loggedIn ? `delivery:${addressId}` : `delivery:${latitude}:${longitude}`;
    const pinned = pinnedBranch.current;
    if (pinned && pinned.scope === scope && branchOptions.branches.some((branch) => branch.id === pinned.id)) {
      setBranchId(pinned.id);
      return;
    }
    const nearestWithStock = branchOptions.branches.find((branch) => branch.canFulfill);
    if (nearestWithStock) {
      setBranchId(nearestWithStock.id);
      return;
    }
    setBranchId(fulfillment === 'pickup' ? (branchOptions.branches[0]?.id ?? '') : '');
  }, [branchOptions, fulfillment, addressId, latitude, longitude, loggedIn]);

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
    fulfillmentPinned.current = next;
    setFulfillment(next);
    clearConfirmErrors();
  }

  // Otra dirección se vuelve a evaluar: domicilio si alguna sucursal llega, retiro si ninguna.
  useEffect(() => {
    if (fulfillmentPinned.current === 'pickup') return;
    fulfillmentPinned.current = null;
    setFulfillment('delivery');
  }, [addressId, latitude, longitude]);

  function showConfirmError(err: unknown) {
    if (err instanceof ApiError && err.code === 'OUT_OF_COVERAGE') {
      setCoverageError(err.body as OutOfCoverageError);
    } else if (err instanceof ApiError && err.code === 'OUT_OF_STOCK') {
      setStockError(err.body as OutOfStockError);
    } else if (err instanceof ApiError && err.code === 'BRANCH_CLOSED') {
      setClosedAsk(err.message);
    } else {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el pedido');
    }
  }

  function closedMessage(): string | null {
    const branch = branchOptions?.branches.find((item) => item.id === branchId);
    if (!branch || branch.openNow !== false) return null;
    if (!branch.nextOpenAt) return `${branch.name} está cerrada y no tiene un próximo horario de apertura.`;
    return `${branch.name} está cerrada. Abre ${nextOpenPhrase(branch.nextOpenAt)}. ¿Lo dejamos programado para esa hora?`;
  }

  async function confirmLoggedIn(event: FormEvent | null, scheduleWhenClosed = false) {
    event?.preventDefault();
    if (cart?.purchaseBlocked) {
      setError(CART_DISABLED_MESSAGE);
      return;
    }
    if (fulfillment === 'delivery' && !addressId) {
      setError('Elegí una dirección de entrega.');
      return;
    }
    if (!branchId) {
      setError('Elegí la sucursal.');
      return;
    }
    if (!scheduleWhenClosed) {
      const message = closedMessage();
      if (message?.includes('no tiene')) {
        setError(message);
        return;
      }
      if (message) {
        setClosedAsk(message);
        return;
      }
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
          ...(scheduleWhenClosed ? { scheduleWhenClosed: true } : {}),
          ...(couponId ? { couponIncidentId: couponId } : {}),
        }),
      });
      await refresh();
      rememberConfirmed(created, paymentMethod);
      navigate(`/checkout/pedido/${created.id}`, { replace: true });
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
      const addressError = addressPartsError(guestAddress);
      if (addressError) {
        nextErrors.address = addressError;
      }

      if (!latitude.trim()) {
        nextErrors.latitude = 'Marcá la ubicación: buscá la dirección o tocá el mapa.';
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

  async function confirmGuest(event: FormEvent | null, scheduleWhenClosed = false) {
    event?.preventDefault();
    clearConfirmErrors();
    if (cart?.purchaseBlocked) {
      setError(CART_DISABLED_MESSAGE);
      return;
    }

    if (!validateGuest()) {
      return;
    }
    if (!branchId) {
      setError('Elegí la sucursal.');
      return;
    }
    if (!scheduleWhenClosed) {
      const message = closedMessage();
      if (message?.includes('no tiene')) {
        setError(message);
        return;
      }
      if (message) {
        setClosedAsk(message);
        return;
      }
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
                street: guestAddress.street.trim(),
                city: guestAddress.city.trim(),
                province: guestAddress.province,
                postalCode: normalizePostalCode(guestAddress.postalCode),
                latitude: Number(latitude),
                longitude: Number(longitude),
              }
            : {}),
          items: current.items.map(guestOrderItem),
          ...(scheduleWhenClosed ? { scheduleWhenClosed: true } : {}),
        }),
      });
      clearGuestCart();
      await refresh();
      rememberConfirmed(created, paymentMethod);
      navigate(`/checkout/pedido/${created.id}`, { replace: true });
    } catch (err) {
      showConfirmError(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !order && !orderId) return <p className="muted">Cargando…</p>;

  if (orderId && !order) {
    return (
      <section className="stack">
        <p className={orderError ? 'error' : 'muted'} role={orderError ? 'alert' : undefined}>
          {orderError || 'Cargando el pedido…'}
        </p>
      </section>
    );
  }

  if (order) {
    return (
      <section className="stack checkout-page">
        <header className="page-head">
          <h1>Pedido confirmado</h1>
        </header>
        <div className="card form checkout order-confirmed">
          <div className="checkout-block">
            <div className="checkout-receive">
              <div className="order-status-marks">
                {order.scheduledFor ? <span className="scheduled-badge">Programado</span> : null}
                {showPickupBadge(order.status, order.fulfillment) ? <span className="pickup-badge">Retiro</span> : null}
                <span className={`badge badge--${order.status}`}>
                  {orderStatusLabel(order.status, order.fulfillment)}
                </span>
              </div>
              <p className="muted">{orderStatusHint(order.status, order.fulfillment)}</p>
            </div>
          </div>

          {order.loyalty ? (
            <div className="checkout-block">
              <LoyaltyStampsCard loyalty={order.loyalty} context="checkout" />
            </div>
          ) : null}

          <div className="checkout-block">
            <h2>Datos</h2>
            <dl className="order-confirmed-facts">
              <div className="is-wide">
                <dt>Código</dt>
                <dd className="order-public-code">{order.code ? `#${order.code}` : order.id}</dd>
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
                    ? `${order.address.alias?.trim() ? `${order.address.alias.trim()} · ` : ''}${formatAddress(order.address)}`
                    : formatBranchAddress(order.branch)}
                </dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatDateTime(order.createdAt)}</dd>
              </div>
              {order.scheduledFor ? (
                <div className="is-wide">
                  <dt>Programado</dt>
                  <dd>La sucursal lo empieza {formatDateTime(order.scheduledFor)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Pago</dt>
                <dd>{paymentLabel(paymentMethod)}</dd>
              </div>
            </dl>
          {paymentMethod === 'transfer' ? (
            <div className="checkout-block">
              <TransferInfo amount={order.totalAmount} />
            </div>
          ) : null}
          </div>

          <div className="checkout-block">
            <h2>Resumen</h2>
            <ul className="order-items">
              {withSaucesLast(withExtraImages(order, catalog).items, catalog).map((item) => {
                const itemTotal = item.subtotal ?? item.quantity * item.unitPrice;
                const note = parseNotesAndExtras(item.notes).kitchenNote;
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
                    <LineExtras className="checkout-line-extras" extras={item.extras ?? []} />
                    {note ? <small className="muted checkout-line-note">{note}</small> : null}
                  </li>
                );
              })}
            </ul>
            <PriceBreakdown
              subtotal={order.subtotal}
              discountAmount={order.discountAmount}
              deliveryFee={order.address ? (order.deliveryFee ?? 0) : null}
              totalAmount={order.totalAmount}
              promotionName={order.promotionName}
              promotionType={order.promotionType}
              promotionValue={order.promotionValue}
              discounts={order.discounts}
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

  // El envío de la sucursal elegida, el mismo que se cobra al confirmar. Retiro no tiene línea de envío.
  const selectedDeliveryFee =
    branchOptions?.fulfillment === 'delivery'
      ? (branchOptions.branches.find((branch) => branch.id === branchId)?.deliveryFee ?? null)
      : null;
  
  // HU-31: lo que falta para el envío gratis. Solo en domicilio y con el parámetro activo.
  const freeDelivery: FreeDeliveryProgress | null =
    branchOptions?.fulfillment === 'delivery' ? (branchOptions.freeDelivery ?? null) : null;

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
                        {address.alias?.trim() || address.city || address.province || address.postalCode ? (
                          <span className="checkout-choice-meta">{formatAddress(address)}</span>
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
              onChange={selectBranch}
              hint=""
              blockedReason={blockedReason}
            />
          </div>
          <div className="checkout-block">
            <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
          </div>
          <div className="checkout-block">
          <OrderSummary
            cart={cart}
            catalog={catalog}
            quote={quote}
            deliveryFee={selectedDeliveryFee}
            freeDelivery={freeDelivery}
            saving={saving}
            shortages={stockError?.items ?? []}
            blockedReason={blockedReason}
            selectedCouponId={couponId}
            onSelectCoupon={(id) => {
              saveClaimCouponId(id);
              setCouponId(id);
            }}
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
              <AddressFields
                value={guestAddress}
                onChange={(patch) => {
                  setGuestAddress((current) => ({ ...current, ...patch }));
                  if (guestErrors.address) setGuestErrors((prev) => ({ ...prev, address: undefined }));
                }}
                disabled={saving}
              />
              {guestErrors.address ? (
                <small className="error" role="alert">
                  {guestErrors.address}
                </small>
              ) : null}
              <AddressLocationPicker
                address={guestAddress}
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setGuestErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
                }}
                onAddressFound={(patch) => {
                  setGuestAddress((current) => ({ ...current, ...patch }));
                  setGuestErrors((prev) => ({ ...prev, address: undefined }));
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
              onChange={selectBranch}
              hint={
                fulfillment === 'delivery'
                  ? 'Completá latitud y longitud para ver qué sucursales llegan a tu dirección.'
                  : ''
              }
              blockedReason={blockedReason}
            />
          </div>
          <div className="checkout-block">
            <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
          </div>
          <div className="checkout-block">
            <OrderSummary
              cart={cart}
              catalog={catalog}
              quote={quote}
              deliveryFee={selectedDeliveryFee}
              freeDelivery={freeDelivery}
              saving={saving}
              shortages={stockError?.items ?? []}
              blockedReason={blockedReason}
            />
          </div>
        </form>
      )}
      {closedAsk ? (
        <ConfirmModal
          title="La sucursal está cerrada"
          message={closedAsk}
          confirmLabel="Programarlo"
          dismissLabel="Cancelar"
          busy={saving}
          busyLabel="Programando…"
          onConfirm={() => {
            setClosedAsk(null);
            if (loggedIn) void confirmLoggedIn(null, true);
            else void confirmGuest(null, true);
          }}
          onClose={() => {
            if (!saving) setClosedAsk(null);
          }}
        />
      ) : null}
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
              {options.fulfillment === 'delivery' ? (
                <span className="checkout-choice-meta">
                  · Envío {branch.deliveryFee > 0 ? formatPrice(branch.deliveryFee) : 'gratis'}
                </span>
              ) : null}
            </span>
            <span className="checkout-choice-meta">{formatBranchAddress(branch)}</span>
            <small className="checkout-choice-meta">{branch.openingHours}</small>
            {openStatusLabel(branch.openNow, branch.nextOpenAt) ? (
              <small className={branch.openNow ? 'branch-stock branch-stock--ok' : 'branch-stock branch-stock--short'}>
                {openStatusLabel(branch.openNow, branch.nextOpenAt)}
              </small>
            ) : null}
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
  deliveryFee,
  totalAmount,
  hideDiscountRow = false,
  promotionId,
  promotionName,
  promotionType,
  promotionValue,
  discounts,
}: {
  subtotal: number;
  discountAmount: number;
  // null: no es a domicilio, no hay línea de envío.
  deliveryFee: number | null;
  totalAmount: number;
  // true cuando PromotionOffers ya muestra el descuento aplicado.
  hideDiscountRow?: boolean;
  promotionId?: string | null;
  promotionName?: string | null;
  promotionType?: 'percent' | 'two_for_one' | null;
  promotionValue?: number | null;
  discounts?: OrderDiscountLine[];
}) {
  const caption = discountCaption({ id: promotionId, name: promotionName, type: promotionType, value: promotionValue });
  const showDiscountRow = Boolean(discountAmount) && !hideDiscountRow;
  if (!discountAmount && deliveryFee === null) {
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
      {discounts && discounts.length > 0 && !hideDiscountRow
        ? discounts.map((line) => (
            <p className="total-row total-row--detail" key={`${line.kind}-${line.name}`}>
              <span>{orderDiscountLabel(line, { type: promotionType, value: promotionValue })}</span>
              <strong>−{formatPrice(line.amount)}</strong>
            </p>
          ))
        : showDiscountRow ? (
        <p className="total-row total-row--detail">
          <span className="total-discount">
            <span>Descuento</span>
            {caption ? <small>{caption}</small> : null}
          </span>
          <strong>−{formatPrice(discountAmount)}</strong>
        </p>
      ) : null}
      {deliveryFee !== null ? (
        <p className="total-row total-row--detail">
          <span>Envío</span>
          <strong>{deliveryFee > 0 ? formatPrice(deliveryFee) : 'Gratis'}</strong>
        </p>
      ) : null}
      <p className="total-row">
        <span>Total</span>
        <strong>{formatPrice(totalAmount)}</strong>
      </p>
    </>
  );
}

function OrderSummary({
  cart,
  catalog,
  quote,
  deliveryFee,
  freeDelivery,
  saving,
  shortages,
  blockedReason,
  selectedCouponId,
  onSelectCoupon,
}: {
  cart: Cart;
  catalog: Product[];
  quote: PromotionQuote | null;
  deliveryFee: number | null;
  freeDelivery: FreeDeliveryProgress | null;
  saving: boolean;
  shortages: OutOfStockItem[];
  blockedReason: string;
  selectedCouponId?: string | null;
  onSelectCoupon?: (incidentId: string) => void;
}) {
  // Igual que al confirmar: total con descuento + envío, redondeado a centavos.
  const itemsTotal = quote?.totalAmount ?? cart.total;
  const totalAmount = Math.round((itemsTotal + (deliveryFee ?? 0)) * 100) / 100;
  return (
    <>
      <h2>Resumen</h2>
      <ul className="order-items">
        {withSaucesLast(cart.items, catalog).map((item) => {
          const shortage = shortages.find((entry) => entry.productId === item.productId);
          const note = parseNotesAndExtras(item.notes).kitchenNote;
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
              <LineExtras className="checkout-line-extras" extras={item.extras ?? []} />
              {note ? <small className="muted checkout-line-note">{note}</small> : null}
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
      <PromotionOffers offers={quote?.offers} selectedCouponId={selectedCouponId} onSelectCoupon={onSelectCoupon} />
      <PriceBreakdown
        subtotal={quote?.subtotal ?? cart.total}
        discountAmount={quote?.discountAmount ?? 0}
        deliveryFee={deliveryFee}
        totalAmount={totalAmount}
        hideDiscountRow={(quote?.offers?.length ?? 0) > 0}
        promotionId={quote?.promotion?.id}
        promotionName={quote?.promotion?.name}
        promotionType={quote?.promotion?.type}
        promotionValue={quote?.promotion?.value}
      />
      {freeDelivery && (freeDelivery.qualifies || (deliveryFee ?? 0) > 0) ? (
        <p
          className={freeDelivery.qualifies ? 'free-delivery-note free-delivery-note--ok' : 'free-delivery-note'}
          role="status"
        >
          {freeDelivery.qualifies
            ? 'Envío gratis'
            : `Te faltan ${formatPrice(freeDelivery.missing)} para el envío gratis`}
        </p>
      ) : null}

      {cart.purchaseBlocked ? (
        <p className="warning" role="status">
          {CART_DISABLED_MESSAGE}
        </p>
      ) : null}
      <button type="submit" disabled={saving || Boolean(blockedReason) || Boolean(cart.purchaseBlocked)}>
        {saving ? 'Confirmando…' : 'Confirmar pedido'}
      </button>
      <p className="checkout-back">
        <Link to="/cart">Volver al carrito</Link>
      </p>
    </>
  );
}