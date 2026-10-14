import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/jwt-payload';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CheckoutBranchesDto } from './dto/checkout-branches.dto';
import { OrdersService } from './orders.service';

// Es una lectura, pero el invitado manda sus ítems en el cuerpo (no hay carrito en el servidor).
@Controller('branches')
export class CheckoutBranchesController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  list(@Req() req: Request & { user?: JwtPayload }, @Body() dto: CheckoutBranchesDto) {
    return this.ordersService.listBranchesForCheckout(dto, req.user);
  }
}
