import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccountService } from './account.service';
import { MeController } from './me.controller';

@Module({
  imports: [AuthModule],
  controllers: [MeController],
  providers: [AccountService],
})
export class AccountModule {}
