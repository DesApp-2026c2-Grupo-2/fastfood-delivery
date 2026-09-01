import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '../categories/slug';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const withRelations = {
  categories: { orderBy: { name: 'asc' as const } },
  images: { orderBy: { sortOrder: 'asc' as const } },
};

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof withRelations }>;

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function normalizeImageUrl(url: string) {
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('bad protocol');
    }
    return trimmed;
  } catch {
    throw new BadRequestException('Cada imagen tiene que ser un archivo subido o una URL http/https');
  }
}

function serialize(product: ProductWithRelations) {
  const firstCategory = product.categories[0];
  return {
    ...product,
    price: Number(product.price),
    imageUrl: product.images[0]?.url ?? '',
    categoryId: firstCategory?.id,
    category: firstCategory,
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
        ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
      },
      include: withRelations,
      orderBy: { name: 'asc' },
    });
    return products.map(serialize);
  }

  async findPublicById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, available: true },
      include: withRelations,
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return serialize(product);
  }

  async findAllAdmin(categoryId?: string) {
    const products = await this.prisma.product.findMany({
      where: categoryId ? { categories: { some: { id: categoryId } } } : {},
      include: withRelations,
      orderBy: { name: 'asc' },
    });
    return products.map(serialize);
  }

  async findOneAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: withRelations,
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return serialize(product);
  }

  async create(dto: CreateProductDto) {
    const name = dto.name.trim();
    const slug = await this.ensureUniqueSlug(this.resolveSlug(dto.slug, name));
    const categoryIds = await this.assertCategories(dto.categoryIds);
    const imageUrls = dto.imageUrls.map(normalizeImageUrl);

    const product = await this.prisma.product.create({
      data: {
        name,
        slug,
        description: dto.description.trim(),
        price: dto.price,
        available: dto.available,
        categories: { connect: categoryIds.map((id) => ({ id })) },
        images: {
          create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })),
        },
      },
      include: withRelations,
    });
    return serialize(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const current = await this.findOneAdmin(id);
    const name = dto.name?.trim() ?? current.name;
    const slugSource = dto.slug !== undefined ? dto.slug : current.slug;
    const slug = await this.ensureUniqueSlug(this.resolveSlug(slugSource, name), id);
    const categoryIds = dto.categoryIds ? await this.assertCategories(dto.categoryIds) : undefined;
    const imageUrls = dto.imageUrls?.map(normalizeImageUrl);

    const product = await this.prisma.$transaction(async (tx) => {
      if (imageUrls) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }
      return tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.available !== undefined ? { available: dto.available } : {}),
          ...(categoryIds ? { categories: { set: categoryIds.map((categoryId) => ({ id: categoryId })) } } : {}),
          ...(imageUrls
            ? { images: { create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })) } }
            : {}),
        },
        include: withRelations,
      });
    });
    return serialize(product);
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    await this.prisma.product.delete({ where: { id } });
    return { id };
  }

  private resolveSlug(raw: string | undefined, name: string): string {
    const slug = slugify(raw?.trim() || name);
    if (!slug) {
      throw new BadRequestException('El slug no puede quedar vacío');
    }
    return slug;
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Ya existe un producto con ese slug');
    }
    return slug;
  }

  private async assertCategories(ids: string[]) {
    const categoryIds = uniqueIds(ids);
    if (categoryIds.length === 0) {
      throw new BadRequestException('Elegí al menos una categoría');
    }
    await Promise.all(categoryIds.map((id) => this.categoriesService.findOne(id)));
    return categoryIds;
  }
}
