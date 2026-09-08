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
    street: string;
  };
  items: OrderItem[];
};
