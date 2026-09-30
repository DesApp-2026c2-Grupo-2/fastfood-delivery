import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { orderStatusCatalog } from './order-status';

// Consulta de los estados de pedido (RF-ADM-08). Solo lectura: la máquina de estados está en order-status.ts.
@Controller('admin/order-statuses')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminOrderStatusesController {
  @Get()
  findAll() {
    return orderStatusCatalog();
  }
}
