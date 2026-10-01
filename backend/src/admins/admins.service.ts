import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { hashPassword } from '../auth/password';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

const adminSelect = { id: true, name: true, email: true, createdAt: true };

// El administrador del seed. Es el único que no se puede borrar.
const INITIAL_ADMIN_EMAIL = 'admin@rapido.local';

type AdminRow = { id: string; name: string; email: string; createdAt: Date };

@Injectable()
export class AdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.admin },
      orderBy: { createdAt: 'asc' },
      select: adminSelect,
    });
    return admins.map((admin) => this.serialize(admin));
  }

  async create(dto: CreateAdminDto) {
    await this.assertEmailAvailable(dto.email);
    const admin = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        role: Role.admin,
      },
      select: adminSelect,
    });
    return this.serialize(admin);
  }

  async update(id: string, dto: UpdateAdminDto) {
    const admin = await this.findAdmin(id);
    if (dto.name === undefined && dto.email === undefined && dto.password === undefined) {
      throw new BadRequestException('No hay cambios para guardar');
    }
    if (dto.email && dto.email !== admin.email && this.isInitialAdmin(admin.email)) {
      throw new ConflictException('El email del administrador inicial no se puede cambiar');
    }
    if (dto.email && dto.email !== admin.email) {
      await this.assertEmailAvailable(dto.email, id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.password !== undefined ? { passwordHash: await hashPassword(dto.password) } : {}),
      },
      select: adminSelect,
    });
    return this.serialize(updated);
  }

  async remove(id: string) {
    const admin = await this.findAdmin(id);
    if (this.isInitialAdmin(admin.email)) {
      throw new ConflictException('El administrador inicial no se puede borrar');
    }
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Este administrador tiene datos asociados y no se puede borrar');
      }
      throw error;
    }
    return { id };
  }

  private async findAdmin(id: string) {
    const admin = await this.prisma.user.findFirst({
      where: { id, role: Role.admin },
      select: adminSelect,
    });
    if (!admin) {
      throw new NotFoundException('Administrador no encontrado');
    }
    return admin;
  }

  private async assertEmailAvailable(email: string, excludeId?: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }
  }

  private isInitialAdmin(email: string) {
    return email.toLowerCase() === INITIAL_ADMIN_EMAIL;
  }

  private serialize(admin: AdminRow) {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      createdAt: admin.createdAt,
      deletable: !this.isInitialAdmin(admin.email),
    };
  }
}
