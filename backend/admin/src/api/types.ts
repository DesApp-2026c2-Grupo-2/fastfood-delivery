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
