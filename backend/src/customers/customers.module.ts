import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminCustomersController } from './admin-customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminCustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
