import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOneForUser(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }
    return address;
  }

  async create(userId: string, dto: CreateAddressDto) {
    const isDefault = dto.isDefault ?? false;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const count = await tx.address.count({ where: { userId } });
      const shouldDefault = isDefault || count === 0;

      if (shouldDefault && !isDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          street: dto.street.trim(),
          latitude: new Prisma.Decimal(dto.latitude),
          longitude: new Prisma.Decimal(dto.longitude),
          isDefault: shouldDefault,
        },
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.findOneForUser(userId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          ...(dto.street !== undefined ? { street: dto.street.trim() } : {}),
          ...(dto.latitude !== undefined
            ? { latitude: new Prisma.Decimal(dto.latitude) }
            : {}),
          ...(dto.longitude !== undefined
            ? { longitude: new Prisma.Decimal(dto.longitude) }
            : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
  }

  async remove(userId: string, id: string) {
    const address = await this.findOneForUser(userId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });

      if (address.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { id };
  }
}
