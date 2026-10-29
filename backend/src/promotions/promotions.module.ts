import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ParametersModule } from '../parameters/parameters.module';
import { AdminPromotionsController } from './admin-promotions.controller';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

// La cotización (POST /api/promotions/quote) vive en OrdersModule: necesita el carrito y los ítems del pedido.
@Module({
  imports: [AuthModule, ParametersModule],
  controllers: [AdminPromotionsController, PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}