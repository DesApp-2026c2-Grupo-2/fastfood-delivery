import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CustomerGuard } from '../auth/customer.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { SyncCartBlockDto } from './dto/sync-cart-block.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type AuthedRequest = Request & { user: JwtPayload };

@Controller('cart')
@UseGuards(JwtAuthGuard, CustomerGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: AuthedRequest) {
    return this.cartService.getCart(req.user.sub);
  }

  @Delete()
  reset(@Req() req: AuthedRequest) {
    return this.cartService.reset(req.user.sub);
  }

  @Post('release-check')
  applyReleaseBlock(@Req() req: AuthedRequest, @Body() dto: SyncCartBlockDto) {
    return this.cartService.applyReleaseBlock(req.user.sub, dto.items);
  }

  @Post('items')
  addItem(@Req() req: AuthedRequest, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(req.user.sub, dto);
  }

  @Patch('items/:id')
  updateItem(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItem(req.user.sub, id, dto);
  }

  @Delete('items/:id')
  removeItem(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.cartService.removeItem(req.user.sub, id);
  }

  @Delete('items/:id/extras/:extraId')
  removeExtra(@Req() req: AuthedRequest, @Param('id') id: string, @Param('extraId') extraId: string) {
    return this.cartService.removeExtra(req.user.sub, id, extraId);
  }
}
