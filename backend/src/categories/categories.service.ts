import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

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
    return this.prisma.category.create({ data: { name: dto.name.trim() } });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name?.trim() },
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
}
