import type { QuotedOffer } from '../api/types';
import { discountCaption } from '../lib/discount-label';
import { formatPrice } from '../lib/money';

export function PromotionOffers({ offers }: { offers?: QuotedOffer[] }) {
  const list = offers ?? [];
  if (list.length === 0) return null;

  return (
    <div className="promo-offers-block">
      <ul className="promo-offers" aria-label="Promociones de este pedido">
        {list.map((offer) => (
          <li key={offer.id} className={offer.applied ? 'promo-offer promo-offer--applied' : 'promo-offer'}>
            <span className="promo-offer-mark">{offer.applied ? 'Se aplica' : 'No se suma'}</span>
            <span className="promo-offer-name">
              {discountCaption({ id: offer.id, name: offer.name, type: offer.type, value: offer.value })}
            </span>
            <strong>−{formatPrice(offer.discountAmount)}</strong>
          </li>
        ))}
      </ul>
      {list.length > 1 ? (
        <p className="muted promo-offers-note">Se aplica solo la que más te conviene. Las otras no se suman.</p>
      ) : null}
    </div>
  );
}
