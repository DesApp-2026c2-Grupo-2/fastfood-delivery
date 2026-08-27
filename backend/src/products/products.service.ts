import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const withCategory = { category: true } as const;

type ProductWithCategory = Prisma.ProductGetPayload<{ include: typeof withCategory }>;

function serialize(product: Product | ProductWithCategory) {
  return {
    ...product,
    price: Number(product.price),
  };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findPublic(categoryId?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        available: true,
        ...(categoryId ? { categoryId } : {}),
      },
      include: withCategory,
      orderBy: { name: 'asc' },
    });
    return products.map(serialize);
  }

  async findPublicById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, available: true },
      include: withCategory,
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return serialize(product);
  }

  async findAllAdmin(categoryId?: string) {
    const products = await this.prisma.product.findMany({
      where: categoryId ? { categoryId } : {},
      include: withCategory,
      orderBy: { name: 'asc' },
    });
    return products.map(serialize);
  }

  async findOneAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: withCategory,
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return serialize(product);
  }

  async create(dto: CreateProductDto) {
    await this.categoriesService.findOne(dto.categoryId);
    const product = await this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        price: dto.price,
        imageUrl: dto.imageUrl.trim(),
        available: dto.available,
        categoryId: dto.categoryId,
      },
      include: withCategory,
    });
    return serialize(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOneAdmin(id);
    if (dto.categoryId) {
      await this.categoriesService.findOne(dto.categoryId);
    }
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl.trim() } : {}),
        ...(dto.available !== undefined ? { available: dto.available } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      },
      include: withCategory,
    });
    return serialize(product);
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    await this.prisma.product.delete({ where: { id } });
    return { id };
  }
}
