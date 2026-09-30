import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashPassword, passwordMatches, toPublicUser } from '../auth/password';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    return toPublicUser(await this.findUser(userId));
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.findUser(userId);
    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.newPassword !== undefined || dto.currentPassword !== undefined) {
      if (!dto.currentPassword || !dto.newPassword) {
        throw new BadRequestException('Para cambiar la contraseña ingresá la actual y la nueva');
      }
      // 400 y no 401: un 401 haría que el front cierre la sesión.
      if (!(await passwordMatches(dto.currentPassword, user.passwordHash))) {
        throw new BadRequestException('La contraseña actual no es correcta');
      }
      if (dto.newPassword === dto.currentPassword) {
        throw new BadRequestException('La contraseña nueva tiene que ser distinta de la actual');
      }
      data.passwordHash = await hashPassword(dto.newPassword);
    }

    if (Object.keys(data).length === 0) {
      return toPublicUser(user);
    }
    return toPublicUser(await this.prisma.user.update({ where: { id: userId }, data }));
  }

  private async findUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Token inválido');
    }
    return user;
  }
}
