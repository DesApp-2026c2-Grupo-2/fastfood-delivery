import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminStockController } from './admin-stock.controller';
import { StockReleasesController } from './stock-releases.controller';
import { StockService } from './stock.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminStockController, StockReleasesController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
