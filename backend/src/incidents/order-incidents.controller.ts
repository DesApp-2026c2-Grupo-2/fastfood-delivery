import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CustomerGuard } from '../auth/customer.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { IncidentsService } from './incidents.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('orders')
export class OrderIncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post(':id/incident/seen')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  markSeen(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.incidentsService.markResponseSeen(req.user.sub, id);
  }

  @Post(':id/incident')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  create(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: CreateIncidentDto) {
    return this.incidentsService.create(req.user.sub, id, dto);
  }
}