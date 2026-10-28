import { Module } from '@nestjs/common';
import { ParametersModule } from '../parameters/parameters.module';
import { DeliveryFeesService } from './delivery-fees.service';

// El precio por km se edita en /admin/parameters; este módulo solo calcula el envío.
@Module({
  imports: [ParametersModule],
  providers: [DeliveryFeesService],
  exports: [DeliveryFeesService],
})
export class DeliveryFeesModule {}
