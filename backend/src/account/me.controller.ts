import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { AccountService } from './account.service';
import { UpdateMeDto } from './dto/update-me.dto';

type AuthedRequest = Request & { user: JwtPayload };

// Perfil del usuario logueado (HU-14). Cada uno ve y edita solo lo suyo: el id sale del token.
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  findMe(@Req() req: AuthedRequest) {
    return this.accountService.findMe(req.user.sub);
  }

  @Patch()
  updateMe(@Req() req: AuthedRequest, @Body() dto: UpdateMeDto) {
    return this.accountService.updateMe(req.user.sub, dto);
  }
}
