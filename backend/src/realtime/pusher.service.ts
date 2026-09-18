import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import Pusher from 'pusher';
import { JwtPayload } from '../auth/jwt-payload';
import type { OrderStatusChangedEvent } from '../orders/order-events';
import { ADMIN_ORDERS_CHANNEL, ORDER_STATUS_EVENT, userOrdersChannel } from './channels';

@Injectable()
export class PusherService {
  private readonly logger = new Logger(PusherService.name);
  private readonly client: Pusher | null;

  constructor(private readonly config: ConfigService) {
    const appId = this.config.get<string>('PUSHER_APP_ID')?.trim();
    const key = this.config.get<string>('PUSHER_KEY')?.trim();
    const secret = this.config.get<string>('PUSHER_SECRET')?.trim();
    const cluster = this.config.get<string>('PUSHER_CLUSTER')?.trim();

    this.client =
      appId && key && secret && cluster
        ? new Pusher({ appId, key, secret, cluster, useTLS: true })
        : null;
  }

  isEnabled() {
    return this.client !== null;
  }

  publicConfig() {
    if (!this.client) {
      return { enabled: false as const };
    }
    return {
      enabled: true as const,
      key: this.config.get<string>('PUSHER_KEY')?.trim() ?? '',
      cluster: this.config.get<string>('PUSHER_CLUSTER')?.trim() ?? '',
    };
  }

  authorize(user: JwtPayload, socketId: string, channelName: string) {
    if (!this.client) {
      throw new ForbiddenException('Pusher no está configurado');
    }
    if (!this.canSubscribe(user, channelName)) {
      throw new ForbiddenException('No podés suscribirte a ese canal');
    }
    return this.client.authorizeChannel(socketId, channelName);
  }

  async publishOrderStatus(event: OrderStatusChangedEvent) {
    if (!this.client) {
      return;
    }
    const channels = [ADMIN_ORDERS_CHANNEL];
    if (event.userId) {
      channels.push(userOrdersChannel(event.userId));
    }
    try {
      await this.client.trigger(channels, ORDER_STATUS_EVENT, event);
    } catch (err) {
      this.logger.error('No se pudo publicar el estado en Pusher', err instanceof Error ? err.stack : err);
    }
  }

  private canSubscribe(user: JwtPayload, channelName: string) {
    if (user.role === Role.admin) {
      return channelName === ADMIN_ORDERS_CHANNEL;
    }
    if (user.role === Role.customer) {
      return channelName === userOrdersChannel(user.sub);
    }
    return false;
  }
}
