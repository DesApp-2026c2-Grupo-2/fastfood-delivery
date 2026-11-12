export type Role = 'customer' | 'admin';

export type LoyaltyProgress = {
  stamps: number;
  progress: number;
  ordersRequired: number;
  minOrderAmount: number;
  active?: boolean;
  qualifiesThisOrder: boolean;
  rewardOnThisOrder: boolean;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  loyaltyStamps?: number;
  hasTopBuyerReward?: boolean;
  loyalty?: LoyaltyProgress;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
};

export type ProductImage = {
  id: string;
  url: string;
  sortOrder: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  available: boolean;
  twoForOne?: boolean;
  images: ProductImage[];
  categories: Category[];
  imageUrl: string;
  categoryId?: string;
  category?: Category;
  createdAt?: string;
  updatedAt?: string;
  // Solo en GET /products/:id: los adicionales que el admin marcó en este producto y están disponibles (HU-30).
  extras?: ProductExtraOption[];
};

export type ProductExtraOption = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};

export type UpdateMeRequest = {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
};

export type Address = {
  id: string;
  alias: string;
  street: string;
  // Vacíos en las direcciones cargadas antes de pedirlos.
  city: string | null;
  province: string | null;
  postalCode: string | null;
  latitude: number | string;
  longitude: number | string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  notes: string;
  unitPrice: number;
  subtotal: number;
  product: {
    id: string;
    name: string;
    available: boolean;
    imageUrl: string;
  };
  extras?: OrderItemExtra[];
  addedAt?: string;
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  total: number;
  purchaseBlocked?: boolean;
};

// DEV-17: Tipo para adicionales reales
export type OrderItemExtra = {
  id: string;
  name: string;
  price?: number;
  imageUrl?: string | null;
};

export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  notes: string;
  unitPrice: number;
  subtotal: number;
  product: {
    id: string;
    name: string;
    imageUrl: string;
  };
  extras?: OrderItemExtra[];
};

export type QuotedOffer = {
  id: string;
  name: string;
  type: 'percent' | 'two_for_one';
  value: number;
  discountAmount: number;
  applied: boolean;
  stacks?: boolean;
  expiresAt?: string;
};

export type PromotionQuote = {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  promotion: { id: string; name: string; type: 'percent' | 'two_for_one'; value: number } | null;
  offers?: QuotedOffer[];
};

export type OrderDiscountLine = {
  kind: 'promotion' | 'coupon';
  name: string;
  amount: number;
};

export type Order = {
  id: string;
  code?: string;
  status: string;
  fulfillment?: Fulfillment;
  subtotal: number;
  discountAmount: number;
  discounts?: OrderDiscountLine[];
  claimCouponCode?: string | null;
  promotionName: string | null;
  promotionType?: 'percent' | 'two_for_one' | null;
  promotionValue?: number | null;
  // Envío cobrado; 0 en retiro y en pedidos anteriores al costo de envío.
  deliveryFee?: number;
  totalAmount: number;
  createdAt: string;
  scheduledFor?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  // Solo en la respuesta de crear pedido autenticado.
  loyalty?: LoyaltyProgress;
  branch: {
    id: string;
    name: string;
    address: string;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
  };
  address: {
    id: string;
    alias?: string;
    street: string;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
  } | null;
  items: OrderItem[];
};

// Lo que devuelve GET /orders (listado)
export type OrderSummary = {
  id: string;
  code?: string;
  status: string;
  fulfillment?: Fulfillment;
  totalAmount: number;
  createdAt: string;
  scheduledFor?: string | null;
  branch: { id: string; name: string };
  itemCount: number;
  loyaltyStampGranted?: boolean;
  hasIncident?: boolean;
  hasResolution?: boolean;
  resolutionUnseen?: boolean;
  // Abierto: todavía no hay cupón, o el cupón no se usó.
  claimOpen?: boolean;
  // Código del cupón de reclamo que este pedido consumió.
  claimCouponCode?: string | null;
  estimatedDeliveryAt?: string | null;
  delayMinutes?: number | null;
};

export type RepeatSkipped = {
  kind: 'product' | 'extra';
  name: string;
  message: string;
};

export type RepeatOrderResult = {
  cart: Cart;
  skipped: RepeatSkipped[];
};

// Extensiones para seguimiento de pedidos (HU-10)
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export interface OrderHistoryItem {
  id: string;
  status: OrderStatus;
  changedAt: string;
  changedByName?: string;
}

export type OrderDetail = Order & {
  history?: OrderHistoryItem[];
  etaMinutes?: number | null;
  estimatedDeliveryAt?: string | null;
  delayMinutes?: number | null;
  canCancel?: boolean;
  incident?: Incident | null;
  canReportIncident?: boolean;
};

// Sucursales disponibles (HU-19): GET /branches/available
export type AvailableBranch = {
  id: string;
  name: string;
  address: string;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  phone: string;
  openingHours: string;
  openNow?: boolean | null;
  nextOpenAt?: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

export type AvailableBranchesResponse = {
  radiusKm: number;
  branches: AvailableBranch[];
};

// GET /api/branches (DEV-22): todas las activas. Sin ubicación, distanceKm y withinRadius vienen null.
export type ActiveBranch = Omit<AvailableBranch, 'distanceKm'> & {
  distanceKm: number | null;
  withinRadius: boolean | null;
};

export type ActiveBranchesResponse = {
  radiusKm: number;
  branches: ActiveBranch[];
};

// Errores del checkout (HU-18 / HU-19): POST /orders y /orders/guest
export type OutOfCoverageError = {
  code: 'OUT_OF_COVERAGE';
  message: string;
  radiusKm: number;
};

export type OutOfStockItem = {
  productId: string;
  name: string;
  requested: number;
  available: number;
};

export type OutOfStockError = {
  code: 'OUT_OF_STOCK';
  message: string;
  branch: { id: string; name: string };
  items: OutOfStockItem[];
};

// Retiro o domicilio y sucursal elegida (HU-23): POST /branches/checkout
export type Fulfillment = 'delivery' | 'pickup';

export type CheckoutBranchMissing = {
  productId: string;
  name: string;
  requested: number;
  available: number;
};

export type CheckoutBranch = {
  id: string;
  name: string;
  address: string;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  phone: string;
  openingHours: string;
  openNow?: boolean | null;
  nextOpenAt?: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  withinRadius: boolean | null;
  // Lo que se cobraría de envío desde esta sucursal (precio por km del admin). En retiro, 0.
  deliveryFee: number;
  canFulfill: boolean;
  missing: CheckoutBranchMissing[];
};

export type FreeDeliveryProgress = {
  minSubtotal: number;
  qualifies: boolean;
  // Lo que falta para llegar al mínimo; 0 si ya llegó.
  missing: number;
};

export type CheckoutBranchesResponse = {
  fulfillment: Fulfillment;
  radiusKm: number;
  // null si el envío gratis está desactivado o el pedido es de retiro.
  freeDelivery?: FreeDeliveryProgress | null;
  branches: CheckoutBranch[];
};

// HU-36: reclamo sobre un pedido entregado o retirado.
export type IncidentReason = 'missing_item' | 'wrong_order' | 'late' | 'cold' | 'other';

export type IncidentCoupon = {
  code: string;
  amount: number;
  used: boolean;
  status: 'available' | 'used' | 'expired';
  createdAt: string;
  expiresAt: string;
};

export type Incident = {
  id: string;
  reason: IncidentReason;
  message: string;
  status: 'open' | 'resolved';
  response: string;
  coupon: IncidentCoupon | null;
  createdAt: string;
  resolvedAt: string | null;
  responseUnseen?: boolean;
};

export const INCIDENT_REASONS: { value: IncidentReason; label: string }[] = [
  { value: 'missing_item', label: 'Faltó algo' },
  { value: 'wrong_order', label: 'Pedido equivocado' },
  { value: 'late', label: 'Llegó tarde' },
  { value: 'cold', label: 'Llegó frío' },
  { value: 'other', label: 'Otro' },
];