import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAdminsController } from './admin-admins.controller';
import { AdminsService } from './admins.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminAdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
