/** Id virtual de la cotización. No hay fila en Promotion: el cupón vive en el reclamo. */
export const INCIDENT_COUPON_PREFIX = 'incident-coupon:';

export function incidentCouponPromotionId(incidentId: string) {
  return `${INCIDENT_COUPON_PREFIX}${incidentId}`;
}

export function incidentIdFromCouponPromotion(promotionId: string | null | undefined) {
  if (!promotionId?.startsWith(INCIDENT_COUPON_PREFIX)) return null;
  const incidentId = promotionId.slice(INCIDENT_COUPON_PREFIX.length);
  return incidentId || null;
}
