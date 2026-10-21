import type { User } from '../api/types';

export const CUSTOMER_TOKEN_KEY = 'customer_token';
export const CUSTOMER_USER_KEY = 'customer_user';

function read(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

let expiryNotified = false;

export const SESSION_EXPIRED_EVENT = 'mordi-customer-session-expired';
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Volvé a entrar.';
const NOTICE_KEY = 'customer_auth_notice';

export function saveSession(token: string, user: User, remember: boolean) {
  expiryNotified = false;
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(CUSTOMER_TOKEN_KEY, token);
  store.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  const token = read(CUSTOMER_TOKEN_KEY);
  if (!token) return null;
  if (!tokenUnusable(token)) return token;
  markSessionExpired();
  return null;
}

function readJwtSub(token: string): string {
  try {
    const part = token.split('.')[1];
    if (!part) return '';
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: unknown };
    return typeof json.sub === 'string' ? json.sub : '';
  } catch {
    return '';
  }
}

export function getUserId(): string {
  const token = getToken();
  if (token) {
    const sub = readJwtSub(token);
    if (sub) return sub;
  }
  return getUser()?.id ?? '';
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

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

function tokenUnusable(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= Date.now();
}

export function consumeAuthNotice(): string {
  const value = sessionStorage.getItem(NOTICE_KEY) ?? '';
  if (value) sessionStorage.removeItem(NOTICE_KEY);
  return value;
}

export function hasAuthNotice(): boolean {
  return Boolean(sessionStorage.getItem(NOTICE_KEY));
}

export function markSessionExpired() {
  if (expiryNotified) return;
  expiryNotified = true;
  clearSession();
  sessionStorage.setItem(NOTICE_KEY, SESSION_EXPIRED_MESSAGE);
  queueMicrotask(() => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)));
}

export function updateStoredUser(user: User) {
  const store = sessionStorage.getItem(CUSTOMER_TOKEN_KEY) ? sessionStorage : localStorage;
  store.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
}

export function isCustomer(): boolean {
  return Boolean(getToken()) && getUser()?.role === 'customer';
}
