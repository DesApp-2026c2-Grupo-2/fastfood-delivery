import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminDeliveryFeesController } from './admin-delivery-fees.controller';
import { DeliveryFeesService } from './delivery-fees.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminDeliveryFeesController],
  providers: [DeliveryFeesService],
  exports: [DeliveryFeesService],
})
export class DeliveryFeesModule {}
