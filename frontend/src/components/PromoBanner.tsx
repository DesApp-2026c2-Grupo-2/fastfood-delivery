import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BrandLogo } from './BrandLogo';
import { formatPrice } from '../lib/money';

type PercentOffer = {
  id: string;
  name: string;
  value: number;
  minSubtotal: number;
};

export function PromoBanner() {
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

  if (!offer) return null;

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
