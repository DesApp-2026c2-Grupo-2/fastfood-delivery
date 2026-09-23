import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CustomerGuard } from '../auth/customer.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('guest')
  createGuest(@Body() dto: CreateGuestOrderDto) {
    return this.ordersService.createGuest(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  create(@Req() req: AuthedRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromCart(req.user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  findAll(@Req() req: AuthedRequest) {
    return this.ordersService.findAllForUser(req.user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, CustomerGuard)
  findOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.ordersService.findOneForUser(req.user.sub, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, CustomerGuard)
  cancel(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.ordersService.cancelForUser(req.user.sub, id);
  }

  @Post(':id/repeat')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, CustomerGuard)
  repeat(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.ordersService.repeatForUser(req.user.sub, id);
  }
}
