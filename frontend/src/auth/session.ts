import type { User } from '../api/types';

export const CUSTOMER_TOKEN_KEY = 'customer_token';
export const CUSTOMER_USER_KEY = 'customer_user';

function read(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

export function saveSession(token: string, user: User, remember: boolean) {
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(CUSTOMER_TOKEN_KEY, token);
  store.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
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

export function clearSession() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_USER_KEY);
  sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
  sessionStorage.removeItem(CUSTOMER_USER_KEY);
}

export function isCustomer(): boolean {
  return getUser()?.role === 'customer' && Boolean(getToken());
}
