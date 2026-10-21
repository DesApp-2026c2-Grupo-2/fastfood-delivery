import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminPromotionsController } from './admin-promotions.controller';
import { PromotionsService } from './promotions.service';

// La cotización (POST /api/promotions/quote) vive en OrdersModule: necesita el carrito y los ítems del pedido.
@Module({
  imports: [AuthModule],
  controllers: [AdminPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
