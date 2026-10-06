import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { User } from '../api/types';
import { getUser } from './session';

type SessionContextValue = {
  user: User | null;
  customer: boolean;
  refresh: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getUser());

  const refresh = useCallback(() => {
    setUser(getUser());
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