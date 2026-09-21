import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PusherService } from '../realtime/pusher.service';

export type OrderStatusChangedEvent = {
  orderId: string;
  userId: string | null;
  status: OrderStatus;
  previousStatus: OrderStatus | null;
  changedAt: string;
};

@Injectable()
export class OrderEvents {
  constructor(private readonly pusher: PusherService) {}

  notifyStatusChanged(event: OrderStatusChangedEvent) {
    void this.pusher.publishOrderStatus(event);
  }
}
