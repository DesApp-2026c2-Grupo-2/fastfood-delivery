import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from './password';

export const RESET_TOKEN_TTL_MINUTES = 30;

const GENERIC_MESSAGE =
  'Si el email está registrado, te enviamos las instrucciones para cambiar la contraseña.';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Sin SMTP, el token se muestra en la respuesta (modo demo del Sprint 3). Activo por defecto fuera de
 * producción; PASSWORD_RESET_DEMO=true|false lo fuerza. Se lee en cada pedido para poder cambiarlo en los tests.
 */
function demoMode() {
  const flag = process.env.PASSWORD_RESET_DEMO?.trim().toLowerCase();
  if (flag) {
    return flag === 'true';
  }
  return process.env.NODE_ENV !== 'production';
}

/** Recuperar contraseña (HU-15). Solo para clientes: a un admin lo gestiona otro admin. */
@Injectable()
export class PasswordResetService {
  constructor(private readonly prisma: PrismaService) {}

  async request(email: string) {
    // La respuesta es la misma exista o no el email, para no revelar quién está registrado.
    const response = { message: GENERIC_MESSAGE };

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, role: Role.customer },
      select: { id: true },
    });
    if (!user) {
      return response;
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);
    // Pedir otro token invalida los anteriores que no se usaron.
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
      }),
    ]);

    // En modo demo el token viaja en la respuesta, así que ahí sí se nota si el email existe.
    return demoMode() ? { ...response, demo: { resetToken: token, expiresAt } } : response;
  }

  async reset(token: string, newPassword: string) {
    const invalid = new BadRequestException(
      'El código para cambiar la contraseña no es válido o ya venció. Pedí uno nuevo.',
    );

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    const now = new Date();
    if (!record || record.usedAt || record.expiresAt <= now) {
      throw invalid;
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction(async (tx) => {
      // Un solo uso: si dos pedidos llegan juntos con el mismo token, solo uno lo marca.
      const { count } = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: now },
      });
      if (count === 0) {
        throw invalid;
      }
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    });

    return { message: 'Listo, ya podés iniciar sesión con la contraseña nueva.' };
  }
}
