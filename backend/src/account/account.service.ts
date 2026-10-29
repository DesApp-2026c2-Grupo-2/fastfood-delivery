import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { hashPassword, passwordMatches, toPublicUser } from '../auth/password';
import { ParametersService } from '../parameters/parameters.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametersService: ParametersService,
  ) {}

  async findMe(userId: string) {
    return this.toMeResponse(await this.findUser(userId));
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
      return this.toMeResponse(user);
    }
    return this.toMeResponse(await this.prisma.user.update({ where: { id: userId }, data }));
  }

  private async toMeResponse(user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    adminRole?: import('@prisma/client').AdminRole | null;
    loyaltyStamps?: number;
    hasTopBuyerReward?: boolean;
  }) {
    const base = toPublicUser(user);
    if (user.role !== Role.customer) {
      return base;
    }

    const { ordersRequired, minOrderAmount } = await this.parametersService.loyaltySettings();
    const stamps = user.loyaltyStamps ?? 0;
    return {
      ...base,
      loyalty: {
        stamps,
        progress: stamps % ordersRequired,
        ordersRequired,
        minOrderAmount,
        qualifiesThisOrder: false,
        rewardOnThisOrder: false,
      },
    };
  }

  private async findUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Token inválido');
    }
    return user;
  }
}
