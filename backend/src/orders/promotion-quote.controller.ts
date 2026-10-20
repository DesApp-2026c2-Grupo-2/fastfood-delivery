import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/jwt-payload';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { QuotePromotionDto } from './dto/quote-promotion.dto';
import { OrdersService } from './orders.service';

// Es una lectura, pero el invitado manda sus ítems en el cuerpo (no hay carrito en el servidor).
@Controller('promotions')
export class PromotionQuoteController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  quote(@Req() req: Request & { user?: JwtPayload }, @Body() dto: QuotePromotionDto) {
    return this.ordersService.quote(dto, req.user);
  }
}
