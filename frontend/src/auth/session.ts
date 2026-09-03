import type { User } from '../api/types';

/** Convención compartida con el módulo de auth de cliente (Lucas). */
export const CUSTOMER_TOKEN_KEY = 'customer_token';
export const CUSTOMER_USER_KEY = 'customer_user';

function read(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

export function getToken(): string | null {
  return read(CUSTOMER_TOKEN_KEY);
}

export function getUser(): User | null {
  const raw = read(CUSTOMER_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function isCustomer(): boolean {
  return getUser()?.role === 'customer' && Boolean(getToken());
}
