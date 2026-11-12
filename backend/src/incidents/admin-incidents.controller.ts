import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { AdminGuard, AllowOrdersViewer } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentsService } from './incidents.service';

// El rol "solo pedidos" ve reclamos y cupones, y también los resuelve.
@Controller('admin/incidents')
@UseGuards(JwtAuthGuard, AdminGuard)
@AllowOrdersViewer()
export class AdminIncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  list(@Query('status') status?: IncidentStatus) {
    return this.incidentsService.listAdmin(status);
  }

  @Get('coupons')
  listCoupons() {
    return this.incidentsService.listCoupons();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOneAdmin(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIncidentDto) {
    return this.incidentsService.update(id, dto);
  }
}