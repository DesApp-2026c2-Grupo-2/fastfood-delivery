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
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  available: boolean;
  categoryId: string;
  category?: Category;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};
