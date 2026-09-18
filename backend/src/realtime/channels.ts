export const ADMIN_ORDERS_CHANNEL = 'private-admin-orders';
export const ORDER_STATUS_EVENT = 'order.status.changed';

export function userOrdersChannel(userId: string) {
  return `private-user-${userId}`;
}
