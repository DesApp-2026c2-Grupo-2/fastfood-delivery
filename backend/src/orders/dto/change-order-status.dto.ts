import { OrderStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangeOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
