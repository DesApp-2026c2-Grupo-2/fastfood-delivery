import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';
import type { OrderSummary } from '../api/types';
import { getToken } from '../auth/session';

const CLAIMS_SEEN_EVENT = 'mordi-claims-seen';

/** El detalle marcó una respuesta como vista: el aviso del menú se actualiza en el momento. */
export function notifyClaimsSeen() {
  window.dispatchEvent(new Event(CLAIMS_SEEN_EVENT));
}

/** Reclamos abiertos y respuestas nuevas que el cliente todavía no abrió. */
export function useOpenClaims(customer: boolean) {
  const location = useLocation();
  const [openCount, setOpenCount] = useState(0);
  const [claimCount, setClaimCount] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    if (!customer) {
      setOpenCount(0);
      setClaimCount(0);
      setUnseenCount(0);
      return;
    }

    let cancelled = false;

    async function load() {
      const token = getToken();
      if (!token) {
        if (!cancelled) {
          setOpenCount(0);
          setClaimCount(0);
          setUnseenCount(0);
        }
        return;
      }
      try {
        const orders = await api<OrderSummary[]>('/orders', { token, cache: 'no-store' });
        if (cancelled) return;
        setOpenCount(orders.filter((order) => order.claimOpen).length);
        setClaimCount(orders.filter((order) => order.hasIncident).length);
        setUnseenCount(orders.filter((order) => order.resolutionUnseen).length);
      } catch {
        /* el próximo intento vuelve a consultar */
      }
    }

    function onSeen() {
      void load();
    }

    void load();
    const interval = setInterval(() => void load(), 10000);
    window.addEventListener(CLAIMS_SEEN_EVENT, onSeen);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(CLAIMS_SEEN_EVENT, onSeen);
    };
  }, [customer, location.pathname]);

  return { hasClaims: claimCount > 0, hasOpenClaims: openCount > 0, unseenCount };
}
