import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeliveryFeesService } from './delivery-fees.service';
import { CreateDeliveryFeeTierDto } from './dto/create-delivery-fee-tier.dto';
import { UpdateDeliveryFeeTierDto } from './dto/update-delivery-fee-tier.dto';

// ABM de precios de envío por tramos de distancia.
@Controller('admin/delivery-fees')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDeliveryFeesController {
  constructor(private readonly deliveryFeesService: DeliveryFeesService) {}

  @Get()
  findAll() {
    return this.deliveryFeesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateDeliveryFeeTierDto) {
    return this.deliveryFeesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryFeeTierDto) {
    return this.deliveryFeesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deliveryFeesService.remove(id);
  }
}
