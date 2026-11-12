export const COUPON_VALID_MONTHS = 3;

export type CouponStatus = 'available' | 'used' | 'expired';

export function addMonths(date: Date, months: number) {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

export function couponExpiresAt(createdAt: Date) {
  return addMonths(createdAt, COUPON_VALID_MONTHS);
}

/** Usado gana sobre vencido: si ya se consumió, no vuelve a estar disponible. */
export function couponStatus(createdAt: Date, used: boolean, now = new Date()): CouponStatus {
  if (used) return 'used';
  if (couponExpiresAt(createdAt).getTime() <= now.getTime()) return 'expired';
  return 'available';
}
