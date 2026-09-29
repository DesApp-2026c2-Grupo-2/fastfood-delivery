import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockService } from './stock.service';

// Stock por sucursal y producto (HU-17).
@Controller('admin/branches/:branchId/stock')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  findAll(@Param('branchId') branchId: string) {
    return this.stockService.listForBranch(branchId);
  }

  @Put(':productId')
  update(
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.stockService.setAvailable(branchId, productId, dto.available);
  }
}
