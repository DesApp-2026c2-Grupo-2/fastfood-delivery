import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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
}
