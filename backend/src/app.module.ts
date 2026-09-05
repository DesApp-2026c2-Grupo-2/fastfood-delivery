import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AddressesModule } from './addresses/addresses.module';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AddressesModule,
    BranchesModule,
    CartModule,
    CategoriesModule,
    OrdersModule,
    ProductsModule,
    UploadsModule,
  ],
})
export class AppModule {}
