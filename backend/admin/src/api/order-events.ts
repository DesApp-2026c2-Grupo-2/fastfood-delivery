import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { api } from './client';
import type { OrderStatusChangedEvent } from './types';

const ADMIN_ORDERS_CHANNEL = 'private-admin-orders';
const ORDER_STATUS_EVENT = 'order.status.changed';

type PusherConfig = {
  enabled: boolean;
  key?: string;
  cluster?: string;
};

function subscribePusher(
  token: string,
  config: { key: string; cluster: string },
  onEvent: (event: OrderStatusChangedEvent) => void,
) {
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

  const channel = pusher.subscribe(ADMIN_ORDERS_CHANNEL);
  channel.bind(ORDER_STATUS_EVENT, onEvent);

  return () => {
    channel.unbind(ORDER_STATUS_EVENT, onEvent);
    pusher.unsubscribe(ADMIN_ORDERS_CHANNEL);
    pusher.disconnect();
  };
}

export function useOrderStatusEvents(
  token: string,
  onEvent: (event: OrderStatusChangedEvent) => void,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let stop = () => {};

    void (async () => {
      const config = await api<PusherConfig>('/pusher/config', { token });
      if (cancelled) return;
      if (!config.enabled || !config.key || !config.cluster) {
        console.warn('Pusher no está configurado. Revisá PUSHER_* en backend/.env');
        return;
      }
      stop = subscribePusher(token, { key: config.key, cluster: config.cluster }, (event) =>
        onEventRef.current(event),
      );
      if (cancelled) stop();
    })().catch((error: unknown) => {
      console.warn('No se pudo conectar a Pusher', error);
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [token]);
}
