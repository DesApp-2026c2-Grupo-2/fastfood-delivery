import { createContext, useCallback, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User } from '../api/types';
import { getToken, getUser, hasAuthNotice, SESSION_EXPIRED_EVENT, SESSION_EXPIRED_MESSAGE } from './session';

function readUser(): User | null {
  return getToken() ? getUser() : null;
}

type SessionContextValue = {
  user: User | null;
  customer: boolean;
  refresh: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(() => readUser());

  const refresh = useCallback(() => {
    setUser(readUser());
  }, []);

  useLayoutEffect(() => {
    function goToLogin() {
      setUser(null);
      const path = location.pathname;
      if (path === '/login' || path === '/register' || path === '/forgot-password' || path === '/reset-password') {
        return;
      }
      navigate('/login', {
        replace: true,
        state: { message: SESSION_EXPIRED_MESSAGE, from: `${path}${location.search}` },
      });
    }

    function onExpired() {
      goToLogin();
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    if (hasAuthNotice()) goToLogin();
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [location.pathname, location.search, navigate]);

  const customer = user?.role === 'customer';

  return (
    <SessionContext.Provider value={{ user, customer, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}