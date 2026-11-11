export type Role = 'customer' | 'admin';

export type AdminRole = 'super_admin' | 'orders_viewer';

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: 'Super admin',
  orders_viewer: 'Solo pedidos',
};

export function adminRoleLabel(role: AdminRole | null | undefined) {
  return role === 'orders_viewer' ? ADMIN_ROLE_LABEL.orders_viewer : ADMIN_ROLE_LABEL.super_admin;
}

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  adminRole?: AdminRole | null;
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
  images: ProductImage[];
  categories: Category[];
  imageUrl: string;
  categoryId?: string;
  category?: Category;
  createdAt?: string;
  updatedAt?: string;
};

// GET y PUT /admin/products/:id/extras (HU-30): todos los adicionales, con `offered` en los que el producto ofrece.
export type ProductExtraOption = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  offered: boolean;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo para entregar',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export type Fulfillment = 'delivery' | 'pickup';

export function orderStatusLabel(status: OrderStatus, fulfillment?: Fulfillment | null): string {
  if (fulfillment === 'pickup') {
    if (status === 'ready') return 'Listo para retirar';
    if (status === 'delivered') return 'Retirado';
  }
  return ORDER_STATUS_LABEL[status];
}

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'on_the_way',
  'delivered',
  'cancelled',
];

export type AdminOrderListItem = {
  id: string;
  code?: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  totalAmount: number;
  createdAt: string;
  scheduledFor?: string | null;
  customerName: string;
  customerEmail: string;
  branch: { id: string; name: string };
  itemCount: number;
  estimatedDeliveryAt: string | null;
  etaMinutes: number | null;
  delayMinutes: number | null;
  nextStatuses: OrderStatus[];
};

export type AdminOrderListResponse = {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type OrderStatusChangedEvent = {
  orderId: string;
  userId: string | null;
  status: OrderStatus;
  previousStatus: OrderStatus | null;
  changedAt: string;
};

export type AdminOrderDetail = AdminOrderListItem & {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  promotionName: string | null;
  promotionType: 'percent' | 'two_for_one' | null;
  promotionValue: number | null;
  user: { id: string; name: string; email: string } | null;
  guestName: string | null;
  guestEmail: string | null;
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
  items: {
    id: string;
    productId: string;
    quantity: number;
    notes: string;
    unitPrice: number;
    extras: { id: string; name: string; price: number }[];
    extrasTotal: number;
    subtotal: number;
    product: { id: string; name: string; imageUrl: string };
  }[];
  history: {
    id: string;
    status: OrderStatus;
    changedAt: string;
    changedByName: string;
  }[];
};

export type StockLine = {
  productId: string;
  productName: string;
  productAvailable: boolean;
  imageUrl: string;
  categories: { id: string; name: string; slug: string }[];
  available: number;
  reserved: number;
  updatedAt: string | null;
};

export type SystemParameter = {
  key: string;
  label: string;
  description: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  integer: boolean;
  updatedAt: string | null;
};

export type OrderStatusInfo = {
  status: OrderStatus;
  label: string;
  description: string;
  next: OrderStatus[];
  cancellable: boolean;
  final: boolean;
};

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  adminRole: AdminRole | null;
  createdAt: string;
  deletable: boolean;
};

export type Promotion = {
  id: string;
  name: string;
  type: 'percent' | 'two_for_one';
  value: number;
  productId: string | null;
  productName: string | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  minSubtotal: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Top3RankingEntry = {
  userId: string;
  name: string;
  email: string;
  totalSpent: number;
};

export type LoyaltyHolder = {
  userId: string;
  name: string;
  email: string;
  stamps: number;
};

export type LoyaltyCampaign = {
  active: boolean;
  ordersRequired: number;
  minOrderAmount: number;
  discountPercent: number;
  holders: LoyaltyHolder[];
  limits: {
    ordersRequired: { min: number; max: number };
    minOrderAmount: { min: number; max: number };
    discountPercent: { min: number; max: number };
  };
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

export type AdminCustomerList = {
  items: AdminCustomer[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminCustomerDetail = AdminCustomer & {
  addresses: {
    id: string;
    alias: string;
    street: string;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    isDefault: boolean;
  }[];
  recentOrders: {
    id: string;
    status: OrderStatus;
    fulfillment: string;
    totalAmount: number;
    createdAt: string;
    branch: { id: string; name: string };
  }[];
};

export type Top3Campaign = {
  active: boolean;
  startedAt: string | null;
  discountPercent: number;
  limits: { discountPercent: { min: number; max: number } };
  ranking: Top3RankingEntry[];
};

export type Branch = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  latitude: number | string;
  longitude: number | string;
  openingHours: string;
  hours?: { weekday: number; slot?: number; opensAt: string; closesAt: string }[];
  phone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

// HU-36: GET /admin/incidents. Las abiertas vienen primero.
export type IncidentReason = 'missing_item' | 'wrong_order' | 'late' | 'cold' | 'other';
export type IncidentStatus = 'open' | 'resolved';

export const INCIDENT_REASON_LABEL: Record<IncidentReason, string> = {
  missing_item: 'Faltó algo',
  wrong_order: 'Pedido equivocado',
  late: 'Llegó tarde',
  cold: 'Llegó frío',
  other: 'Otro',
};

export type IncidentCouponStatus = 'available' | 'used' | 'expired';

export const INCIDENT_COUPON_STATUS_LABEL: Record<IncidentCouponStatus, string> = {
  available: 'Vigente',
  used: 'Usado',
  expired: 'Vencido',
};

export type IncidentCoupon = {
  code: string;
  amount: number;
  used: boolean;
  status: IncidentCouponStatus;
  createdAt: string;
  expiresAt: string;
};

export type AdminIncidentCoupon = {
  id: string;
  code: string;
  amount: number;
  status: IncidentCouponStatus;
  orderId: string;
  orderCode: string;
  customerName: string;
  reportedAt: string;
  createdAt: string;
  expiresAt: string;
};

export type AdminIncident = {
  id: string;
  reason: IncidentReason;
  message: string;
  status: IncidentStatus;
  response: string;
  coupon: IncidentCoupon | null;
  createdAt: string;
  resolvedAt: string | null;
  orderId: string;
  orderCode: string;
  fulfillment: Fulfillment;
  totalAmount: number;
  branch: { id: string; name: string };
  customerName: string;
  customerEmail: string;
};

export type ProductReportItem = {
  id: string;
  name: string;
  branchName?: string;
  unitsSold?: number;
  totalRevenue?: number;
  stock?: number;
};

export type ProductReports = {
  topSelling: ProductReportItem[];
  leastSelling: ProductReportItem[];
  outOfStock: ProductReportItem[];
  topRevenue: ProductReportItem[];
};

export type OrderReports = {
  branches: { id: string; name: string }[];
  ordersByDay: { date: string; count: number }[];
  salesByDay: { date: string; totalAmount: number }[];
  ordersByStatus: { status: OrderStatus; label: string; count: number }[];
  ordersByBranch: { branchId: string; branchName: string; count: number }[];
  cancelled: { count: number; percent: number };
  averageDeliveryMinutes: number | null;
  salesByBranch: { branchId: string; branchName: string; totalAmount: number }[];
  productsByBranch: {
    branchId: string;
    branchName: string;
    productId: string;
    productName: string;
    unitsSold: number;
  }[];
  topCustomers: { userId: string; name: string; email: string; orderCount: number }[];
  topPromotions: { promotionName: string; orderCount: number; totalDiscount: number }[];
};
