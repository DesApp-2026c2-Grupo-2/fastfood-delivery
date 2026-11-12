import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { Cart } from '../api/types';
import { useSession } from '../auth/SessionContext';
import { getToken, isCustomer } from '../auth/session';
import { getGuestCart } from './guestCart';

type CartContextValue = {
  count: number;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function countItems(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const sessionKey = user?.id ?? '';
  const [sessionKeySeen, setSessionKeySeen] = useState(sessionKey);
  const [count, setCount] = useState(0);
  const requestId = useRef(0);

  // Al cambiar de cuenta (o cerrar sesión) el conteo anterior no puede seguir en el header.
  if (sessionKey !== sessionKeySeen) {
    setSessionKeySeen(sessionKey);
    requestId.current += 1;
    setCount(sessionKey ? 0 : countItems(getGuestCart()));
  }

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const next = isCustomer()
        ? countItems(await api<Cart>('/cart', { token: getToken() ?? '' }))
        : countItems(getGuestCart());
      if (id !== requestId.current) return;
      setCount(next);
    } catch {
      if (id !== requestId.current) return;
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, sessionKey]);

  return <CartContext.Provider value={{ count, refresh }}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}