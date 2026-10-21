import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { BrandLogo } from './BrandLogo';
import { formatPrice } from '../lib/money';

type PercentOffer = {
  id: string;
  name: string;
  value: number;
  minSubtotal: number;
};

function hidesBanner(pathname: string) {
  return (
    pathname === '/branches' ||
    pathname === '/account' ||
    pathname.startsWith('/account/') ||
    pathname === '/orders' ||
    pathname.startsWith('/orders/')
  );
}

export function PromoBanner() {
  const { pathname } = useLocation();
  const [offer, setOffer] = useState<PercentOffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ offer: PercentOffer | null }>('/promotions/banner')
      .then((data) => {
        if (!cancelled) setOffer(data.offer);
      })
      .catch(() => {
        if (!cancelled) setOffer(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!offer || hidesBanner(pathname)) return null;

  return (
    <aside className="promo-banner">
      <BrandLogo size={56} />
      <p>
        Si hacés un pedido a partir de <strong>{formatPrice(offer.minSubtotal)}</strong>, accedés a un{' '}
        <strong>{offer.value}% de descuento</strong>.
      </p>
    </aside>
  );
}
