import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/jwt-payload';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { BranchesService } from './branches.service';
import { AvailableBranchesQueryDto } from './dto/available-branches-query.dto';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  // Todas las activas (DEV-22). La ubicación es opcional: sin ella no hay distancia.
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAllActive(@Req() req: Request & { user?: JwtPayload }, @Query() query: AvailableBranchesQueryDto) {
    return this.branchesService.findAllActive(query, req.user);
  }

  // Con lat/lng la puede usar un invitado; con addressId hace falta el token del dueño de la dirección.
  @Get('available')
  @UseGuards(OptionalJwtAuthGuard)
  findAvailable(@Req() req: Request & { user?: JwtPayload }, @Query() query: AvailableBranchesQueryDto) {
    return this.branchesService.findAvailable(query, req.user);
  }
}
