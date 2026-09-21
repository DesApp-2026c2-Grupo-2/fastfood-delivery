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
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  branch: { id: string; name: string };
  itemCount: number;
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
  user: { id: string; name: string; email: string } | null;
  guestName: string | null;
  guestEmail: string | null;
  branch: { id: string; name: string; address: string };
  address: { id: string; street: string };
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
  etaMinutes: number | null;
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
