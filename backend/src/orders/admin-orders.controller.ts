import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { OrdersService } from './orders.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('code') code?: string,
    @Query('customer') customer?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
  ) {
    return this.ordersService.findAllAdmin({ status, code, customer, from, to, page });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @Post(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeOrderStatusDto, @Req() req: AuthedRequest) {
    return this.ordersService.changeStatus(id, dto.status, req.user.sub);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.ordersService.changeStatus(id, OrderStatus.cancelled, req.user.sub);
  }
}
