import type { QuotedOffer } from '../api/types';
import { claimCouponIncidentId } from '../lib/claim-coupon';
import { discountCaption } from '../lib/discount-label';
import { formatDateTime, formatPrice } from '../lib/money';

export function PromotionOffers({
  offers,
  selectedCouponId,
  onSelectCoupon,
}: {
  offers?: QuotedOffer[];
  selectedCouponId?: string | null;
  onSelectCoupon?: (incidentId: string) => void;
}) {
  const list = offers ?? [];
  if (list.length === 0) return null;

  const promos = list.filter((offer) => !offer.stacks);
  const coupons = list
    .filter((offer) => offer.stacks)
    .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));
  const ordered = [...promos, ...coupons];
  const promoApplied = list.some((offer) => offer.applied && !offer.stacks);
  const choosing = coupons.length > 1 && Boolean(onSelectCoupon);
  const note =
    coupons.length > 1
      ? promoApplied
        ? 'Elegí un solo cupón. Por defecto es el que vence antes, y se suma a la promo.'
        : 'Elegí un solo cupón. Por defecto es el que vence antes.'
      : coupons.some((offer) => offer.applied) && promoApplied
        ? 'El cupón del reclamo se suma al descuento. Las otras promos no se acumulan.'
        : list.filter((offer) => !offer.stacks).length > 1
          ? 'Se aplica solo la que más te conviene. Las otras no se suman.'
          : null;

  return (
    <div className="promo-offers-block">
      <ul className="promo-offers" aria-label="Promociones de este pedido">
        {ordered.map((offer) => {
          const couponId = claimCouponIncidentId(offer.id);
          const checked = couponId != null && (selectedCouponId ? couponId === selectedCouponId : offer.applied);
          if (choosing && couponId && onSelectCoupon) {
            return (
              <li key={offer.id} className={checked ? 'promo-offer promo-offer--applied promo-offer--choice' : 'promo-offer promo-offer--choice'}>
                <label className="promo-offer-choice">
                  <input
                    type="radio"
                    name="claim-coupon"
                    checked={checked}
                    onChange={() => onSelectCoupon(couponId)}
                  />
                  <OfferName offer={offer} />
                  <strong>−{formatPrice(offer.discountAmount)}</strong>
                </label>
              </li>
            );
          }
          return (
            <li key={offer.id} className={offer.applied ? 'promo-offer promo-offer--applied' : 'promo-offer'}>
              <span className="promo-offer-mark">
                {offer.applied ? (offer.stacks && list.some((item) => item.applied && !item.stacks) ? 'Se suma' : 'Se aplica') : 'No se suma'}
              </span>
              <OfferName offer={offer} />
              <strong>−{formatPrice(offer.discountAmount)}</strong>
            </li>
          );
        })}
      </ul>
      {note ? <p className="muted promo-offers-note">{note}</p> : null}
    </div>
  );
}

function OfferName({ offer }: { offer: QuotedOffer }) {
  return (
    <span className="promo-offer-name">
      {discountCaption({ id: offer.id, name: offer.name, type: offer.type, value: offer.value })}
      {offer.expiresAt ? <small className="promo-offer-expiry">Vence el {formatDateTime(offer.expiresAt)}</small> : null}
    </span>
  );
}
