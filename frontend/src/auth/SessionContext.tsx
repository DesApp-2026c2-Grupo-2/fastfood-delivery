import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { User } from '../api/types';
import { getToken, getUser } from './session';

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
  const [user, setUser] = useState<User | null>(() => readUser());

  const refresh = useCallback(() => {
    setUser(readUser());
  }, []);

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