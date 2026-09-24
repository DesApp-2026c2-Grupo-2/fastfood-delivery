export type Role = 'admin' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
}

export interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface ProductExtra {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  categoryId: string;
  category?: Category;
  images: ProductImage[];
  imageUrl?: string;
  extras?: ProductExtra[];
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  notes?: string;
  product: Product;
  unitPrice?: number;
  subtotal?: number;
}

export interface Cart {
  id: string;
  userId?: string;
  items: CartItem[];
  total?: number;
  totalAmount?: number;
}

export interface Address {
  id: string;
  street: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

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

export interface OrderItemProduct {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  product: OrderItemProduct;
}

export interface OrderBranch {
  id: string;
  name: string;
  address?: string;
}

export interface OrderAddress {
  id: string;
  street: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  branch: OrderBranch;
  address: OrderAddress;
  items: OrderItem[];
  history?: OrderHistoryItem[];
  etaMinutes?: number | null;
  customerName?: string;
  customerEmail?: string;
  guestName?: string | null;
  guestEmail?: string | null;
}

export type OrderDetail = Order;