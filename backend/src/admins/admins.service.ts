import { ConflictException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { hashPassword } from '../auth/password';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';

const adminSelect = { id: true, name: true, email: true, createdAt: true };

@Injectable()
export class AdminsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { role: Role.admin },
      orderBy: { createdAt: 'asc' },
      select: adminSelect,
    });
  }

  async create(dto: CreateAdminDto) {
    // Un email no puede ser a la vez cliente y admin: la cuenta es una sola.
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        role: Role.admin,
      },
      select: adminSelect,
    });
  }
}
