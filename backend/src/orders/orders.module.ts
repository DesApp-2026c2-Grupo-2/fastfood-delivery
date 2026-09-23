import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module';
import { AuthModule } from '../auth/auth.module';
import { BranchesModule } from '../branches/branches.module';
import { CartModule } from '../cart/cart.module';
import { ExtrasModule } from '../extras/extras.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrderEvents } from './order-events';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, AddressesModule, BranchesModule, CartModule, ExtrasModule, RealtimeModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrderEvents],
})
export class OrdersModule {}
