import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountModule } from './account/account.module';
import { AddressesModule } from './addresses/addresses.module';
import { AdminsModule } from './admins/admins.module';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { CustomersModule } from './customers/customers.module';
import { DeliveryFeesModule } from './delivery-fees/delivery-fees.module';
import { OrdersModule } from './orders/orders.module';
import { ParametersModule } from './parameters/parameters.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { PromotionsModule } from './promotions/promotions.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StockModule } from './stock/stock.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthController } from './health.controller';
import { ReportsModule } from './reports/reports.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AccountModule,
    AddressesModule,
    AdminsModule,
    BranchesModule,
    CartModule,
    CategoriesModule,
    CustomersModule,
    DeliveryFeesModule,
    OrdersModule,
    ParametersModule,
    ProductsModule,
    PromotionsModule,
    RealtimeModule,
    ReportsModule,
    StockModule,
    UploadsModule,
  ],
})
export class AppModule {}
