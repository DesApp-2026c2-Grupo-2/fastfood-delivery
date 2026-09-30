import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminParametersController } from './admin-parameters.controller';
import { ParametersService } from './parameters.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminParametersController],
  providers: [ParametersService],
  exports: [ParametersService],
})
export class ParametersModule {}
