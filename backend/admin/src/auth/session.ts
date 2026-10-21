import type { User } from '../api/types';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

function read(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

let expiryNotified = false;

export const SESSION_EXPIRED_EVENT = 'mordi-admin-session-expired';
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Volvé a entrar.';
const NOTICE_KEY = 'admin_auth_notice';

export function saveSession(token: string, user: User, remember: boolean) {
  expiryNotified = false;
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  const token = read(TOKEN_KEY);
  if (!token) return null;
  if (!tokenUnusable(token)) return token;
  markSessionExpired();
  return null;
}

export function getUser(): User | null {
  const raw = read(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
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

export function markSessionExpired() {
  if (expiryNotified) return;
  expiryNotified = true;
  clearSession();
  sessionStorage.setItem(NOTICE_KEY, SESSION_EXPIRED_MESSAGE);
  queueMicrotask(() => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)));
}

export function isAdmin(): boolean {
  return Boolean(getToken()) && getUser()?.role === 'admin';
}
