import { Incident, Prisma } from '@prisma/client';
import { couponExpiresAt, couponStatus } from './coupon-term';

type IncidentView = Pick<
  Incident,
  | 'id'
  | 'reason'
  | 'message'
  | 'status'
  | 'response'
  | 'couponCode'
  | 'couponAmount'
  | 'couponCreatedAt'
  | 'createdAt'
  | 'resolvedAt'
  | 'responseSeenAt'
> & {
  redeemedOrder?: { id: string } | null;
};

export function serializeIncident(incident: IncidentView) {
  const amount = incident.couponAmount == null ? null : Number(incident.couponAmount);
  const createdAt = incident.couponCreatedAt;
  const used = incident.redeemedOrder != null;
  const coupon =
    incident.couponCode && amount != null && amount > 0 && createdAt
      ? {
          code: incident.couponCode,
          amount,
          used,
          status: couponStatus(createdAt, used),
          createdAt,
          expiresAt: couponExpiresAt(createdAt),
        }
      : null;

  return {
    id: incident.id,
    reason: incident.reason,
    message: incident.message,
    status: incident.status,
    response: incident.response,
    coupon,
    createdAt: incident.createdAt,
    resolvedAt: incident.resolvedAt,
    responseUnseen: incident.status === 'resolved' && incident.responseSeenAt == null,
  };
}

export function moneyAmount(value: number) {
  return new Prisma.Decimal((Math.round(value * 100) / 100).toFixed(2));
}
