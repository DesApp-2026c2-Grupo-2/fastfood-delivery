import { randomInt } from 'crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentReason, IncidentStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { moneyAmount, serializeIncident } from './serialize-incident';

const adminInclude = {
  order: {
    select: {
      id: true,
      code: true,
      fulfillment: true,
      totalAmount: true,
      branch: { select: { id: true, name: true } },
    },
  },
  user: { select: { name: true, email: true } },
  redeemedOrder: { select: { id: true } },
};

const COUPON_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** El cliente reporta un problema. Uno por pedido, solo del suyo y solo si se entregó o retiró. */
  async create(userId: string, orderId: string, dto: CreateIncidentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true, status: true, incident: { select: { id: true } } },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (order.status !== OrderStatus.delivered) {
      throw new ConflictException('Solo podés reportar un problema en un pedido entregado o retirado');
    }
    if (order.incident) {
      throw new ConflictException('Ya reportaste un problema con este pedido');
    }
    const message = dto.message?.trim() ?? '';
    if (dto.reason === IncidentReason.other && !message) {
      throw new BadRequestException('Contanos qué pasó');
    }

    const created = await this.prisma.incident.create({
      data: { orderId: order.id, userId, reason: dto.reason, message },
    });
    return serializeIncident(created);
  }

  /** El cliente abrió el pedido y ya vio la solución. Si el reclamo sigue abierto, no cambia nada. */
  async markResponseSeen(userId: string, orderId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { orderId, userId },
      include: { redeemedOrder: { select: { id: true } } },
    });
    if (!incident) {
      throw new NotFoundException('Reclamo no encontrado');
    }
    if (incident.status !== IncidentStatus.resolved || incident.responseSeenAt) {
      return serializeIncident(incident);
    }
    const seen = await this.prisma.incident.update({
      where: { id: incident.id },
      data: { responseSeenAt: new Date() },
      include: { redeemedOrder: { select: { id: true } } },
    });
    return serializeIncident(seen);
  }

  /** Listado del admin: abiertas primero (el enum declara open antes que resolved) y, dentro de cada grupo, las más nuevas. */
  async listAdmin(status?: IncidentStatus) {
    if (status && !Object.values(IncidentStatus).includes(status)) {
      throw new BadRequestException('Estado inválido');
    }
    const rows = await this.prisma.incident.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: adminInclude,
    });
    return rows.map((row) => this.toAdmin(row));
  }

  async listCoupons() {
    const rows = await this.prisma.incident.findMany({
      where: { couponCode: { not: null }, couponAmount: { gt: 0 }, couponCreatedAt: { not: null } },
      orderBy: [{ couponCreatedAt: 'desc' }, { id: 'desc' }],
      include: adminInclude,
    });
    return rows.flatMap((row) => {
      const coupon = serializeIncident(row).coupon;
      if (!coupon || !row.couponCreatedAt) return [];
      return [
        {
          id: row.id,
          code: coupon.code,
          amount: coupon.amount,
          status: coupon.status,
          orderId: row.orderId,
          orderCode: row.order.code,
          customerName: row.user.name,
          reportedAt: row.createdAt,
          createdAt: row.couponCreatedAt,
          expiresAt: coupon.expiresAt,
        },
      ];
    });
  }

  async findOneAdmin(id: string) {
    const row = await this.prisma.incident.findUnique({
      where: { id },
      include: adminInclude,
    });
    if (!row) {
      throw new NotFoundException('Reclamo no encontrado');
    }
    return this.toAdmin(row);
  }

  async update(id: string, dto: UpdateIncidentDto) {
    const found = await this.prisma.incident.findUnique({
      where: { id },
      include: { redeemedOrder: { select: { id: true } } },
    });
    if (!found) {
      throw new NotFoundException('Reclamo no encontrado');
    }
    if (found.redeemedOrder) {
      throw new ConflictException('El cliente ya usó el cupón. No se puede cambiar la solución');
    }

    if (dto.status === IncidentStatus.open) {
      const reopened = await this.prisma.incident.update({
        where: { id },
        data: { status: IncidentStatus.open, resolvedAt: null },
        include: { redeemedOrder: { select: { id: true } } },
      });
      return serializeIncident(reopened);
    }

    const response = dto.response?.trim() ?? '';
    if (!response) {
      throw new BadRequestException('Escribí la respuesta para el cliente');
    }

    const coupon = await this.couponForResolution(found, dto.couponAmount);
    const nextAmount = coupon.amount == null ? null : Number(coupon.amount);
    const prevAmount = found.couponAmount == null ? null : Number(found.couponAmount);
    const freshSolution =
      found.status !== IncidentStatus.resolved ||
      response !== found.response ||
      coupon.code !== found.couponCode ||
      nextAmount !== prevAmount;
    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        status: IncidentStatus.resolved,
        resolvedAt: found.resolvedAt ?? new Date(),
        response,
        couponCode: coupon.code,
        couponAmount: coupon.amount,
        couponCreatedAt: coupon.createdAt,
        ...(freshSolution ? { responseSeenAt: null } : {}),
      },
      include: { redeemedOrder: { select: { id: true } } },
    });
    return serializeIncident(updated);
  }

  private toAdmin(row: {
    orderId: string;
    order: {
      code: string;
      fulfillment: string;
      totalAmount: { toString(): string };
      branch: { id: string; name: string };
    };
    user: { name: string; email: string };
    redeemedOrder?: { id: string } | null;
  } & Parameters<typeof serializeIncident>[0]) {
    return {
      ...serializeIncident(row),
      orderId: row.orderId,
      orderCode: row.order.code,
      fulfillment: row.order.fulfillment,
      totalAmount: Number(row.order.totalAmount),
      branch: row.order.branch,
      customerName: row.user.name,
      customerEmail: row.user.email,
    };
  }

  /** null borra el cupón; undefined lo deja; un monto lo crea o actualiza. Si ya se usó, el monto queda fijo. */
  private async couponForResolution(
    found: {
      couponCode: string | null;
      couponAmount: Prisma.Decimal | null;
      couponCreatedAt: Date | null;
      redeemedOrder: { id: string } | null;
    },
    requested: number | null | undefined,
  ) {
    const used = found.redeemedOrder != null;
    if (used) {
      const same =
        requested === undefined ||
        (requested != null && found.couponAmount != null && Number(found.couponAmount) === roundMoney(requested));
      if (!same) {
        throw new ConflictException(
          requested == null ? 'El cupón ya se usó y no se puede quitar' : 'El cupón ya se usó y no se puede cambiar el monto',
        );
      }
      return { code: found.couponCode, amount: found.couponAmount, createdAt: found.couponCreatedAt };
    }

    if (requested === undefined) {
      return { code: found.couponCode, amount: found.couponAmount, createdAt: found.couponCreatedAt };
    }
    if (requested === null) {
      return { code: null, amount: null, createdAt: null };
    }

    return {
      code: found.couponCode ?? (await this.uniqueCouponCode()),
      amount: moneyAmount(requested),
      createdAt: found.couponCode ? (found.couponCreatedAt ?? new Date()) : new Date(),
    };
  }

  private async uniqueCouponCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      let body = '';
      for (let index = 0; index < 6; index += 1) {
        body += COUPON_ALPHABET[randomInt(COUPON_ALPHABET.length)];
      }
      const code = `REC-${body}`;
      const taken = await this.prisma.incident.findUnique({ where: { couponCode: code }, select: { id: true } });
      if (!taken) return code;
    }
    throw new ConflictException('No se pudo generar el cupón. Intentá de nuevo');
  }
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}