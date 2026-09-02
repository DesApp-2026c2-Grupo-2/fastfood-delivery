import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from './slug';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    const slug = this.resolveSlug(dto.slug, name);
    return this.prisma.category.create({ data: { name, slug } });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const current = await this.findOne(id);
    const name = dto.name?.trim() ?? current.name;
    const slugSource = dto.slug !== undefined ? dto.slug : current.slug;
    const slug = this.resolveSlug(slugSource, name);
    return this.prisma.category.update({
      where: { id },
      data: { name, slug },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    if (category._count.products > 0) {
      throw new ConflictException('No se puede borrar una categoría que tiene productos');
    }
    await this.prisma.category.delete({ where: { id } });
    return { id };
  }

  private resolveSlug(raw: string | undefined, name: string): string {
    const slug = slugify(raw?.trim() || name);
    if (!slug) {
      throw new BadRequestException('El slug no puede quedar vacío');
    }
    return slug;
  }
}
