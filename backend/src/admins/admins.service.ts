import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRole, Prisma, Role } from '@prisma/client';
import { hashPassword } from '../auth/password';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { initialAdminPolicy } from './initial-admin.policy';

const adminSelect = { id: true, name: true, email: true, adminRole: true, createdAt: true };

type AdminRow = { id: string; name: string; email: string; adminRole: AdminRole | null; createdAt: Date };

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

  async findOne(id: string) {
    return this.serialize(await this.findAdmin(id));
  }

  async create(dto: CreateAdminDto) {
    await this.assertEmailAvailable(dto.email);
    const admin = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        role: Role.admin,
        adminRole: dto.adminRole ?? AdminRole.super_admin,
      },
      select: adminSelect,
    });
    return this.serialize(admin);
  }

  async update(id: string, dto: UpdateAdminDto, actorId: string) {
    const admin = await this.findAdmin(id);
    if (
      dto.name === undefined &&
      dto.email === undefined &&
      dto.password === undefined &&
      dto.adminRole === undefined
    ) {
      throw new BadRequestException('No hay cambios para guardar');
    }
    if (dto.email) {
      initialAdminPolicy.assertCanChangeEmail(admin.email, dto.email);
    }
    if (dto.adminRole && dto.adminRole !== admin.adminRole) {
      // Un super admin que se baja a sí mismo pierde el acceso a este ABM y no puede volver atrás.
      if (admin.id === actorId) {
        throw new ConflictException('No podés cambiar tu propio rol');
      }
      initialAdminPolicy.assertCanChangeRole(admin.email, dto.adminRole);
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
        ...(dto.adminRole !== undefined ? { adminRole: dto.adminRole } : {}),
      },
      select: adminSelect,
    });
    return this.serialize(updated);
  }

  async remove(id: string, actorId: string) {
    const admin = await this.findAdmin(id);
    if (admin.id === actorId) {
      throw new ConflictException('No podés borrar tu propio usuario');
    }
    initialAdminPolicy.assertCanDelete(admin.email);
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

  private serialize(admin: AdminRow) {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      adminRole: admin.adminRole,
      createdAt: admin.createdAt,
      deletable: !initialAdminPolicy.isInitial(admin.email),
    };
  }
}
