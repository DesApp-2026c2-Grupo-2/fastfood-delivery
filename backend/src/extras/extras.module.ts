import { Module } from '@nestjs/common';
import { ExtrasService } from './extras.service';

@Module({
  providers: [ExtrasService],
  exports: [ExtrasService],
})
export class ExtrasModule {}
