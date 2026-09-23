import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExtrasModule } from '../extras/extras.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [AuthModule, ExtrasModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
