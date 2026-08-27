import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.productsService.findPublic(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findPublicById(id);
  }
}
