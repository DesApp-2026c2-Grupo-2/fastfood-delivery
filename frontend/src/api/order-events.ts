import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { api } from './client';

const ORDER_STATUS_EVENT = 'order.status.changed';

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  on_the_way: 4,
  delivered: 5,
};

/** True si `incoming` es anterior al estado que ya se está mostrando. */
export function isStatusBehind(incoming: string, shown: string): boolean {
  if (incoming === shown) return false;
  if (shown === 'cancelled') return true;
  if (shown === 'delivered') return incoming !== 'delivered';
  if (incoming === 'cancelled') return shown !== 'pending' && shown !== 'confirmed';
  return (STATUS_RANK[incoming] ?? -1) < (STATUS_RANK[shown] ?? -1);
}

export type OrderStatusChangedEvent = {
  orderId: string;
  userId: string | null;
  status: string;
  previousStatus: string | null;
  changedAt: string;
};

type PusherConfig = {
  enabled: boolean;
  key?: string;
  cluster?: string;
};

function userOrdersChannel(userId: string) {
  return `private-user-${userId}`;
}

function subscribePusher(
  token: string,
  userId: string,
  config: { key: string; cluster: string },
  onEvent: (event: OrderStatusChangedEvent) => void,
) {
  const channelName = userOrdersChannel(userId);
  const pusher = new Pusher(config.key, {
    cluster: config.cluster,
    forceTLS: true,
    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        api<{ auth: string }>('/pusher/auth', {
          method: 'POST',
          token,
          body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
        })
          .then((auth) => callback(null, auth))
          .catch((error: unknown) => callback(error instanceof Error ? error : new Error('Pusher auth'), null));
      },
    }),
  });

  const channel = pusher.subscribe(channelName);
  channel.bind(ORDER_STATUS_EVENT, onEvent);

  return () => {
    channel.unbind(ORDER_STATUS_EVENT, onEvent);
    pusher.unsubscribe(channelName);
    pusher.disconnect();
  };
}

export function useOrderStatusEvents(
  token: string,
  userId: string,
  onEvent: (event: OrderStatusChangedEvent) => void,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!token || !userId) return;
    let cancelled = false;
    let stop = () => {};

    void (async () => {
      const config = await api<PusherConfig>('/pusher/config', { token });
      if (cancelled) return;
      if (!config.enabled || !config.key || !config.cluster) return;
      stop = subscribePusher(token, userId, { key: config.key, cluster: config.cluster }, (event) =>
        onEventRef.current(event),
      );
      if (cancelled) stop();
    })().catch(() => {
      /* sin Pusher el pedido se sigue viendo al recargar */
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [token, userId]);
}
