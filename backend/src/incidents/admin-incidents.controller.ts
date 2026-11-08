import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentsService } from './incidents.service';

// Sin @AllowOrdersViewer: el rol "solo pedidos" no ve los reclamos.
@Controller('admin/incidents')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminIncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  list(@Query('status') status?: IncidentStatus) {
    return this.incidentsService.listAdmin(status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIncidentDto) {
    return this.incidentsService.update(id, dto);
  }
}