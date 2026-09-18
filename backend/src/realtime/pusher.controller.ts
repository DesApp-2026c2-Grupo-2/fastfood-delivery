import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { PusherAuthDto } from './dto/pusher-auth.dto';
import { PusherService } from './pusher.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('pusher')
@UseGuards(JwtAuthGuard)
export class PusherController {
  constructor(private readonly pusher: PusherService) {}

  @Get('config')
  config() {
    return this.pusher.publicConfig();
  }

  @Post('auth')
  auth(@Req() req: AuthedRequest, @Body() dto: PusherAuthDto) {
    return this.pusher.authorize(req.user, dto.socket_id, dto.channel_name);
  }
}
