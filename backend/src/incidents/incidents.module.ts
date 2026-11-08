import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminIncidentsController } from './admin-incidents.controller';
import { IncidentsService } from './incidents.service';
import { OrderIncidentsController } from './order-incidents.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrderIncidentsController, AdminIncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}