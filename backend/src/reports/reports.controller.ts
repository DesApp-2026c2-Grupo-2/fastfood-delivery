import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';

// Si en tu backend tienen un Guard de autenticación de admin (ej: AdminAuthGuard o JwtAuthGuard),
// se coloca acá. Si no sabés cuál es todavía, podemos dejarlo libre mientras testeamos.
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('products')
  async getProductReports() {
    return this.reportsService.getProductReports();
  }
}