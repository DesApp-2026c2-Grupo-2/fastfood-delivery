import { Controller, Get } from '@nestjs/common';
import { PromotionsService } from './promotions.service';

// Aviso público del menú. No pide sesión: el cliente lo ve antes de entrar.
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('banner')
  banner() {
    return this.promotionsService.banner();
  }

  @Get('active')
  active() {
    return this.promotionsService.publicSummary();
  }
}
