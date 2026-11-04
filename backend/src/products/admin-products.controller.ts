import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExtrasService } from '../extras/extras.service';
import { CreateProductDto } from './dto/create-product.dto';
import { SetProductExtrasDto } from './dto/set-product-extras.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly extrasService: ExtrasService,
  ) {}

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.productsService.findAllAdmin(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOneAdmin(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  /** "Adicionales que se ofrecen" (HU-30): todos los adicionales, con `offered` en los marcados. */
  @Get(':id/extras')
  findExtras(@Param('id') id: string) {
    return this.extrasService.listForAdmin(id);
  }

  @Put(':id/extras')
  setExtras(@Param('id') id: string, @Body() dto: SetProductExtrasDto) {
    return this.extrasService.setOffered(id, dto.extraIds);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
