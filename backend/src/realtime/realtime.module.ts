import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PusherController } from './pusher.controller';
import { PusherService } from './pusher.service';

@Module({
  imports: [AuthModule],
  controllers: [PusherController],
  providers: [PusherService],
  exports: [PusherService],
})
export class RealtimeModule {}
