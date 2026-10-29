import { randomBytes } from 'crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { hashPassword, passwordMatches, toPublicUser } from '../auth/password';
import { ParametersService } from '../parameters/parameters.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

export const DELETED_USER_NAME = 'Usuario eliminado';

const OPEN_ORDER = { notIn: [OrderStatus.delivered, OrderStatus.cancelled] };

/** Email único e irrecuperable: el original queda libre para volver a registrarse. */
export function deletedUserEmail(userId: string) {
  return `eliminado.${userId}@usuarios.invalid`;
}

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

  /**
   * Baja de la propia cuenta. Anonimiza solo al usuario (nombre, email, clave, sellos y direcciones
   * que no usa un pedido). Los pedidos quedan, con la dirección de entrega que ya tenían.
   */
  async deleteMe(userId: string, password: string) {
    const user = await this.findUser(userId);
    if (user.role !== Role.customer) {
      throw new ForbiddenException('Solo un cliente puede eliminar su cuenta');
    }
    // 400 y no 401: un 401 haría que el front cierre la sesión por una contraseña mal escrita.
    if (!(await passwordMatches(password, user.passwordHash))) {
      throw new BadRequestException('La contraseña no es correcta');
    }

    await this.assertNoOpenOrders(this.prisma, userId);
    const passwordHash = await hashPassword(randomBytes(32).toString('hex'));

    await this.prisma.$transaction(async (tx) => {
      await this.assertNoOpenOrders(tx, userId);

      await tx.cart.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });

      const usedAddresses = await tx.order.findMany({
        where: { userId, addressId: { not: null } },
        select: { addressId: true },
      });
      const keptAddressIds = [
        ...new Set(usedAddresses.map((order) => order.addressId).filter((id): id is string => id !== null)),
      ];

      await tx.address.deleteMany({
        where: {
          userId,
          ...(keptAddressIds.length > 0 ? { id: { notIn: keptAddressIds } } : {}),
        },
      });
      if (keptAddressIds.length > 0) {
        await tx.address.updateMany({
          where: { id: { in: keptAddressIds } },
          data: { userId: null, alias: '', isDefault: false },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          name: DELETED_USER_NAME,
          email: deletedUserEmail(userId),
          passwordHash,
          active: false,
          loyaltyStamps: 0,
          hasTopBuyerReward: false,
        },
      });
    });
  }

  private async assertNoOpenOrders(tx: Prisma.TransactionClient | PrismaService, userId: string) {
    const openOrders = await tx.order.count({
      where: { userId, status: OPEN_ORDER },
    });
    if (openOrders > 0) {
      throw new ConflictException('Tenés un pedido en curso');
    }
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

    const { ordersRequired, minOrderAmount, active } = await this.parametersService.loyaltySettings();
    const stamps = user.loyaltyStamps ?? 0;
    return {
      ...base,
      loyalty: {
        stamps,
        progress: stamps % ordersRequired,
        ordersRequired,
        minOrderAmount,
        active,
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
