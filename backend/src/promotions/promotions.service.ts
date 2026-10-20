import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Promotion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

export type AppliedPromotion = {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  promotion: Pick<Promotion, 'id' | 'name' | 'type'> | null;
};

const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

/** Descuento de una promo sobre el subtotal. Nunca pasa el subtotal. */
export function discountFor(promotion: Pick<Promotion, 'type' | 'value'>, subtotal: number): number {
  switch (promotion.type) {
    case 'percent':
      // round(subtotal × value / 100, 2)
      return Math.min(Math.round(subtotal * promotion.value) / 100, subtotal);
  }
}

// Vigente: activa y, si tiene fechas, ahora está entre ellas.
function currentWhere(now: Date): Prisma.PromotionWhereInput {
  return {
    active: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

function serialize(promotion: Promotion) {
  return {
    id: promotion.id,
    name: promotion.name,
    type: promotion.type,
    value: promotion.value,
    active: promotion.active,
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    createdAt: promotion.createdAt,
    updatedAt: promotion.updatedAt,
  };
}

function toDate(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }
  return value === null ? null : new Date(value);
}

function assertRange(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new BadRequestException('La fecha de inicio no puede ser posterior a la de fin');
  }
}

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * La promo que se aplica a un subtotal (HU-21): entre las vigentes con descuento > 0 gana la que más
   * descuenta; si empatan, la creada más tarde. Sin ninguna, el total es el subtotal.
   */
  async apply(subtotal: number, now = new Date()): Promise<AppliedPromotion> {
    const current = await this.prisma.promotion.findMany({
      where: currentWhere(now),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    let best: { promotion: Promotion; discountAmount: number } | null = null;
    for (const promotion of current) {
      const discountAmount = discountFor(promotion, subtotal);
      // Estrictamente mayor: ante un empate queda la primera, que es la más nueva.
      if (discountAmount > 0 && (!best || discountAmount > best.discountAmount)) {
        best = { promotion, discountAmount };
      }
    }

    const roundedSubtotal = roundMoney(subtotal);
    if (!best) {
      return { subtotal: roundedSubtotal, discountAmount: 0, totalAmount: roundedSubtotal, promotion: null };
    }
    return {
      subtotal: roundedSubtotal,
      discountAmount: best.discountAmount,
      totalAmount: roundMoney(subtotal - best.discountAmount),
      promotion: { id: best.promotion.id, name: best.promotion.name, type: best.promotion.type },
    };
  }

  async findAll() {
    const promotions = await this.prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
    return promotions.map(serialize);
  }

  async findOne(id: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) {
      throw new NotFoundException('Promoción no encontrada');
    }
    return serialize(promotion);
  }

  async create(dto: CreatePromotionDto) {
    const startsAt = toDate(dto.startsAt) ?? null;
    const endsAt = toDate(dto.endsAt) ?? null;
    assertRange(startsAt, endsAt);

    const promotion = await this.prisma.promotion.create({
      data: {
        name: dto.name,
        type: dto.type,
        value: dto.value,
        active: dto.active,
        startsAt,
        endsAt,
      },
    });
    return serialize(promotion);
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const current = await this.findOne(id);
    const startsAt = toDate(dto.startsAt);
    const endsAt = toDate(dto.endsAt);
    assertRange(
      startsAt === undefined ? current.startsAt : startsAt,
      endsAt === undefined ? current.endsAt : endsAt,
    );

    // Los pedidos guardan su descuento y el nombre: editar la promo no los cambia.
    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        value: dto.value,
        active: dto.active,
        startsAt,
        endsAt,
      },
    });
    return serialize(promotion);
  }

  // Borrar solo si ningún pedido la usó; si no, se desactiva con PATCH { active: false }.
  async remove(id: string) {
    await this.findOne(id);
    const used = await this.prisma.order.count({ where: { promotionId: id } });
    if (used > 0) {
      throw new ConflictException('La promoción ya se usó en pedidos: desactivala en lugar de borrarla');
    }
    await this.prisma.promotion.delete({ where: { id } });
    return { id };
  }
}
