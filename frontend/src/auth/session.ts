import type { User } from '../api/types';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

function read(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

export function saveSession(token: string, user: User, remember: boolean) {
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  return read(TOKEN_KEY);
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

export function isAdmin(): boolean {
  return getUser()?.role === 'admin' && Boolean(getToken());
}
