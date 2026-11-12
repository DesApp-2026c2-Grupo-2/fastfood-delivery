import { Controller, Get } from '@nestjs/common';
import { StockService } from './stock.service';

// Público: el carrito de invitado vive en el dispositivo y compara estas fechas para saber si puede comprar.
@Controller('stock')
export class StockReleasesController {
  constructor(private readonly stockService: StockService) {}

  @Get('releases')
  latest() {
    return this.stockService.latestReleases();
  }
}
