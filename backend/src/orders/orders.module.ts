import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module';
import { AuthModule } from '../auth/auth.module';
import { BranchesModule } from '../branches/branches.module';
import { CartModule } from '../cart/cart.module';
import { DeliveryFeesModule } from '../delivery-fees/delivery-fees.module';
import { ExtrasModule } from '../extras/extras.module';
import { ParametersModule } from '../parameters/parameters.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StockModule } from '../stock/stock.module';
import { AdminOrderStatusesController } from './admin-order-statuses.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { CheckoutBranchesController } from './checkout-branches.controller';
import { OrderEvents } from './order-events';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PromotionQuoteController } from './promotion-quote.controller';

@Module({
  imports: [
    AuthModule,
    AddressesModule,
    BranchesModule,
    CartModule,
    DeliveryFeesModule,
    ExtrasModule,
    ParametersModule,
    PromotionsModule,
    RealtimeModule,
    StockModule,
  ],
  controllers: [
    CheckoutBranchesController,
    PromotionQuoteController,
    OrdersController,
    AdminOrdersController,
    AdminOrderStatusesController,
  ],
  providers: [OrdersService, OrderEvents],
})
export class OrdersModule {}
