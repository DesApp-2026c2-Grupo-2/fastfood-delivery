import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Promotion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

export type AppliedPromotion = {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  promotion: Pick<Promotion, 'id' | 'name' | 'type' | 'value'> | null;
};

/** Una línea ya valorizada. El 2x1 suma las cantidades del mismo producto y no descuenta los adicionales. */
export type PromotionLine = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

const promotionInclude = { product: { select: { id: true, name: true } } } satisfies Prisma.PromotionInclude;

type PromotionRow = Prisma.PromotionGetPayload<{ include: typeof promotionInclude }>;

/**
 * Descuento de una promo. Nunca pasa el subtotal.
 * percent: round(subtotal × value / 100, 2). Si hay monto mínimo y el subtotal no lo alcanza, 0.
 * two_for_one: floor(cantidadDelProducto / 2) × precioUnitario. Con menos de 2 unidades, 0.
 */
export function discountFor(
  promotion: Pick<Promotion, 'type' | 'value'> & {
    productId?: string | null;
    minSubtotal?: Prisma.Decimal | number | null;
  },
  subtotal: number,
  lines: PromotionLine[] = [],
): number {
  switch (promotion.type) {
    case 'percent': {
      const minimum = promotion.minSubtotal == null ? 0 : Number(promotion.minSubtotal);
      if (roundMoney(subtotal) < minimum) return 0;
      return Math.min(Math.round(subtotal * promotion.value) / 100, subtotal);
    }
    case 'two_for_one': {
      if (!promotion.productId) return 0;
      const matching = lines.filter((line) => line.productId === promotion.productId);
      const quantity = matching.reduce((sum, line) => sum + line.quantity, 0);
      const freeUnits = Math.floor(quantity / 2);
      if (freeUnits === 0) return 0;
      const unitPrice = matching[0]?.unitPrice ?? 0;
      return Math.min(roundMoney(freeUnits * unitPrice), subtotal);
    }
    default:
      return 0;
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

function serialize(promotion: PromotionRow) {
  return {
    id: promotion.id,
    name: promotion.name,
    type: promotion.type,
    value: promotion.value,
    productId: promotion.productId,
    productName: promotion.product?.name ?? null,
    active: promotion.active,
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    minSubtotal: promotion.minSubtotal == null ? null : Number(promotion.minSubtotal),
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
   * La promo que se aplica al pedido (HU-21): entre las vigentes con descuento > 0 gana la que más
   * descuenta; si empatan, la creada más tarde. Sin ninguna, el total es el subtotal.
   * El 2x1 mira las líneas: sin dos unidades del producto, esa promo no descuenta.
   */
  async apply(subtotal: number, lines: PromotionLine[] = [], now = new Date()): Promise<AppliedPromotion> {
    const current = await this.prisma.promotion.findMany({
      where: currentWhere(now),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    let best: { promotion: Promotion; discountAmount: number } | null = null;
    for (const promotion of current) {
      const discountAmount = discountFor(promotion, subtotal, lines);
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
      promotion: {
        id: best.promotion.id,
        name: best.promotion.name,
        type: best.promotion.type,
        value: best.promotion.value,
      },
    };
  }

  /**
   * El aviso del menú: el porcentual vigente con monto mínimo que más descuenta.
   * Sin uno así, no hay banner.
   */
  async banner(now = new Date()) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { ...currentWhere(now), type: 'percent', minSubtotal: { not: null } },
      orderBy: [{ value: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
    if (!promotion || promotion.minSubtotal == null) return { offer: null };
    return {
      offer: {
        id: promotion.id,
        name: promotion.name,
        value: promotion.value,
        minSubtotal: Number(promotion.minSubtotal),
      },
    };
  }

  /** Productos con un 2x1 vigente. La etiqueta del menú usa este conjunto. */
  async activeTwoForOneProductIds(now = new Date()): Promise<Set<string>> {
    const rows = await this.prisma.promotion.findMany({
      where: { ...currentWhere(now), type: 'two_for_one', productId: { not: null } },
      select: { productId: true },
    });
    return new Set(rows.flatMap((row) => (row.productId ? [row.productId] : [])));
  }

  async findAll() {
    const promotions = await this.prisma.promotion.findMany({
      include: promotionInclude,
      orderBy: { createdAt: 'desc' },
    });
    return promotions.map(serialize);
  }

  async findOne(id: string) {
    return serialize(await this.load(id));
  }

  async create(dto: CreatePromotionDto) {
    const startsAt = toDate(dto.startsAt) ?? null;
    const endsAt = toDate(dto.endsAt) ?? null;
    assertRange(startsAt, endsAt);
    const type = dto.type ?? 'percent';
    const fields = await this.fieldsFor(type, dto.value, dto.productId, type === 'two_for_one' ? null : (dto.minSubtotal ?? null));

    const promotion = await this.prisma.promotion.create({
      data: {
        name: dto.name,
        type,
        value: fields.value,
        productId: fields.productId,
        active: dto.active,
        startsAt,
        endsAt,
        minSubtotal: fields.minSubtotal,
      },
      include: promotionInclude,
    });
    return serialize(promotion);
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const current = await this.load(id);
    const startsAt = toDate(dto.startsAt);
    const endsAt = toDate(dto.endsAt);
    assertRange(
      startsAt === undefined ? current.startsAt : startsAt,
      endsAt === undefined ? current.endsAt : endsAt,
    );

    const type = dto.type ?? current.type;
    const value = dto.value === undefined ? current.value : dto.value;
    const productId = dto.productId === undefined ? current.productId : dto.productId;
    const minSubtotal =
      type === 'two_for_one'
        ? null
        : dto.minSubtotal === undefined
          ? current.minSubtotal == null
            ? null
            : Number(current.minSubtotal)
          : dto.minSubtotal;
    const fields = await this.fieldsFor(type, value, productId, minSubtotal);

    // Los pedidos guardan su descuento y el nombre: editar la promo no los cambia.
    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        name: dto.name,
        type,
        value: fields.value,
        productId: fields.productId,
        active: dto.active,
        startsAt,
        endsAt,
        minSubtotal: fields.minSubtotal,
      },
      include: promotionInclude,
    });
    return serialize(promotion);
  }

  private async load(id: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id }, include: promotionInclude });
    if (!promotion) {
      throw new NotFoundException('Promoción no encontrada');
    }
    return promotion;
  }

  // El porcentual descuenta el pedido entero. El 2x1 exige un producto y no usa el porcentaje.
  private async fieldsFor(
    type: Promotion['type'],
    value: number | undefined,
    productId: string | null | undefined,
    minSubtotal: number | null,
  ) {
    if (type === 'two_for_one') {
      if (!productId) {
        throw new BadRequestException('Elegí el producto del 2x1');
      }
      const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
      if (!product) {
        throw new BadRequestException('Elegí un producto que exista');
      }
      return { value: 0, productId, minSubtotal: null };
    }
    if (value == null || value < 1 || value > 100) {
      throw new BadRequestException('El porcentaje va de 1 a 100');
    }
    if (minSubtotal != null && !(minSubtotal > 0)) {
      throw new BadRequestException('El monto mínimo tiene que ser mayor a 0');
    }
    return { value, productId: null, minSubtotal };
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
