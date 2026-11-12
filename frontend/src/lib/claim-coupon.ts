const STORAGE_KEY = 'mordi-claim-coupon';
const PREFIX = 'incident-coupon:';

export function claimCouponIncidentId(offerId: string | null | undefined): string | null {
  if (!offerId?.startsWith(PREFIX)) return null;
  const id = offerId.slice(PREFIX.length);
  return id || null;
}

export function readClaimCouponId(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveClaimCouponId(id: string | null) {
  try {
    if (id) sessionStorage.setItem(STORAGE_KEY, id);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* el navegador puede bloquear el almacenamiento */
  }
}

export function appliedClaimCouponId(
  offers: { id: string; applied: boolean; stacks?: boolean }[] | undefined,
): string | null {
  const applied = offers?.find((offer) => offer.stacks && offer.applied);
  return applied ? claimCouponIncidentId(applied.id) : null;
}
