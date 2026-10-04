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

export type Address = {
  id: string;
  alias: string;
  street: string;
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
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  total: number;
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

export type Order = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  guestName?: string | null;
  guestEmail?: string | null;
  branch: {
    id: string;
    name: string;
    address: string;
  };
  address: {
    id: string;
    alias?: string;
    street: string;
  };
  items: OrderItem[];
};

// Lo que devuelve GET /orders (listado)
export type OrderSummary = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  branch: { id: string; name: string };
  itemCount: number;
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
};

// Sucursales disponibles (HU-19): GET /branches/available
export type AvailableBranch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  openingHours: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

export type AvailableBranchesResponse = {
  radiusKm: number;
  branches: AvailableBranch[];
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