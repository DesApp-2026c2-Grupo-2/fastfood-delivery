export type Role = 'customer' | 'admin';

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
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
  promotionName: string | null;
  promotionType: 'percent' | 'two_for_one' | null;
  promotionValue: number | null;
  user: { id: string; name: string; email: string } | null;
  guestName: string | null;
  guestEmail: string | null;
  branch: { id: string; name: string; address: string };
  address: { id: string; alias?: string; street: string } | null;
  items: {
    id: string;
    productId: string;
    quantity: number;
    notes: string;
    unitPrice: number;
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
  addresses: { id: string; alias: string; street: string; isDefault: boolean }[];
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
  latitude: number | string;
  longitude: number | string;
  openingHours: string;
  phone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
