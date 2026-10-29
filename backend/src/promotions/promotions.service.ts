import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, Promotion, Role } from '@prisma/client';
import { ParametersService } from '../parameters/parameters.service';
import { PrismaService } from '../prisma/prisma.service';
import { PARAMETERS } from '../parameters/parameters';
import { LOYALTY_REWARD_ID, LOYALTY_REWARD_NAME, TOP3_REWARD_ID, TOP3_REWARD_NAME } from './campaign-rewards';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdateLoyaltyCampaignDto } from './dto/update-loyalty-campaign.dto';
import { UpdateTop3CampaignDto } from './dto/update-top3-campaign.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

export type QuotedOffer = {
  id: string;
  name: string;
  type: Promotion['type'];
  value: number;
  discountAmount: number;
  applied: boolean;
};

export type AppliedPromotion = {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  promotion: Pick<Promotion, 'id' | 'name' | 'type' | 'value'> | null;
  /** Promos con descuento en este pedido. Solo una, la que más descuenta, queda applied. */
  offers: QuotedOffer[];
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

const TOP3_STARTED_AT_KEY = 'top3_campaign_started_at';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametersService: ParametersService,
  ) {}

  /**
   * Obtiene el estado actual de la campaña Top Compradores y el ranking
   * acumulado desde que se inició. Suma pedidos desde que se crean; si se cancelan, dejan de contar.
   */
  async getTopBuyerCampaign() {
    const startedParam = await this.prisma.parameter.findUnique({
      where: { key: TOP3_STARTED_AT_KEY },
    });

    const startedAt = startedParam?.value ? new Date(startedParam.value) : null;
    const active = !!startedAt && !isNaN(startedAt.getTime());

    let ranking: Array<{ userId: string; name: string; email: string; totalSpent: number }> = [];

    if (active && startedAt) {
      const topBuyers = await this.prisma.order.groupBy({
        by: ['userId'],
        where: {
          userId: { not: null },
          status: { not: OrderStatus.cancelled },
          createdAt: { gte: startedAt },
        },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10,
      });

      const users = await this.prisma.user.findMany({
        where: { id: { in: topBuyers.map((b) => b.userId as string) } },
        select: { id: true, name: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      ranking = topBuyers.map((entry) => {
        const u = userMap.get(entry.userId as string);
        return {
          userId: entry.userId as string,
          name: u?.name ?? 'Usuario',
          email: u?.email ?? '',
          totalSpent: Number(entry._sum.totalAmount ?? 0),
        };
      });
    }

    return {
      active,
      startedAt,
      discountPercent: await this.parametersService.top3DiscountPercent(),
      limits: {
        discountPercent: {
          min: PARAMETERS.top3_discount_percent.min,
          max: PARAMETERS.top3_discount_percent.max,
        },
      },
      ranking,
    };
  }

  async updateTopBuyerCampaign(dto: UpdateTop3CampaignDto) {
    await this.parametersService.update({ top3_discount_percent: dto.discountPercent });
    return this.getTopBuyerCampaign();
  }

  /**
   * Inicia una nueva campaña para recolectar el gasto de las compras a partir de ahora.
   * Si ya hay una activa, no la sobrescribe: hay que cerrarla con award primero.
   */
  async startTopBuyerCampaign() {
    const current = await this.getTopBuyerCampaign();
    if (current.active) {
      throw new ConflictException(
        'Ya hay una campaña Top 3 activa. Cerrala con award antes de iniciar otra.',
      );
    }

    const startedAt = new Date().toISOString();
    await this.prisma.parameter.create({
      data: { key: TOP3_STARTED_AT_KEY, value: startedAt },
    });

    return this.getTopBuyerCampaign();
  }

  /**
   * Cierra la campaña actual, otorga el beneficio a los 3 mayores compradores,
   * limpia premios de campañas anteriores sin usar y deja la campaña inactiva.
   */
  async awardTopBuyerCampaign() {
    const campaign = await this.getTopBuyerCampaign();
    if (!campaign.active || !campaign.startedAt) {
      throw new BadRequestException('No hay una campaña de Top Compradores activa.');
    }

    const top3 = campaign.ranking.slice(0, 3);
    const top3UserIds = top3.map((entry) => entry.userId);

    await this.prisma.$transaction(async (tx) => {
      // Premios viejos sin consumir no se acumulan entre campañas.
      await tx.user.updateMany({
        where: { hasTopBuyerReward: true },
        data: { hasTopBuyerReward: false },
      });

      if (top3UserIds.length > 0) {
        await tx.user.updateMany({
          where: { id: { in: top3UserIds } },
          data: { hasTopBuyerReward: true },
        });
      }

      await tx.parameter.deleteMany({
        where: { key: TOP3_STARTED_AT_KEY },
      });
    });

    return {
      awardedUsers: top3,
      message: `Se otorgó el beneficio a los ${top3.length} mayores compradores y se cerró la campaña.`,
    };
  }

  /**
   * La promo que se aplica al pedido (HU-21):
   * Entre las vigentes con descuento > 0 gana la que más descuenta.
   * Además compara si corresponde beneficio por fidelidad o beneficio activo de Top Comprador.
   */
  async apply(
    subtotal: number,
    lines: PromotionLine[] = [],
    now = new Date(),
    userId?: string,
  ): Promise<AppliedPromotion> {
    const current = await this.prisma.promotion.findMany({
      where: currentWhere(now),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const candidates: Omit<QuotedOffer, 'applied'>[] = [];
    for (const promotion of current) {
      const discountAmount = discountFor(promotion, subtotal, lines);
      if (discountAmount <= 0) continue;
      candidates.push({
        id: promotion.id,
        name: promotion.name,
        type: promotion.type,
        value: promotion.value,
        discountAmount,
      });
    }

    // Evaluación de beneficios para usuario logueado
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { loyaltyStamps: true, hasTopBuyerReward: true },
      });

      // Parámetros dinámicos configurables desde el panel de admin
      const { ordersRequired, discountPercent, minOrderAmount, active } = await this.parametersService.loyaltySettings();
      const top3Percent = await this.parametersService.top3DiscountPercent();

      // Premio fidelidad: si esta compra suma sello y con ese sello se completa la meta.
      if (
        active &&
        user &&
        subtotal >= minOrderAmount &&
        (user.loyaltyStamps + 1) % ordersRequired === 0
      ) {
        const stampDiscount = roundMoney(subtotal * (discountPercent / 100));
        if (stampDiscount > 0) {
          candidates.push({
            id: LOYALTY_REWARD_ID,
            name: LOYALTY_REWARD_NAME,
            type: 'percent',
            value: discountPercent,
            discountAmount: stampDiscount,
          });
        }
      }

      // Beneficio Top Comprador de un solo uso, otorgado al cerrar la campaña.
      if (user?.hasTopBuyerReward) {
        const topBuyerDiscount = roundMoney(subtotal * (top3Percent / 100));
        if (topBuyerDiscount > 0) {
          candidates.push({
            id: TOP3_REWARD_ID,
            name: TOP3_REWARD_NAME,
            type: 'percent',
            value: top3Percent,
            discountAmount: topBuyerDiscount,
          });
        }
      }
    }

    // Empate: se queda la primera. Las promos llegan de la más nueva a la más vieja, y un beneficio solo gana si descuenta más.
    let bestIndex = -1;
    candidates.forEach((candidate, index) => {
      if (bestIndex === -1 || candidate.discountAmount > candidates[bestIndex].discountAmount) {
        bestIndex = index;
      }
    });
    const best = bestIndex === -1 ? null : candidates[bestIndex];
    const offers = candidates
      .map((candidate, index) => ({ ...candidate, applied: index === bestIndex }))
      .sort((a, b) => Number(b.applied) - Number(a.applied) || b.discountAmount - a.discountAmount);

    const roundedSubtotal = roundMoney(subtotal);
    if (!best) {
      return { subtotal: roundedSubtotal, discountAmount: 0, totalAmount: roundedSubtotal, promotion: null, offers };
    }
    return {
      subtotal: roundedSubtotal,
      discountAmount: best.discountAmount,
      totalAmount: roundMoney(subtotal - best.discountAmount),
      promotion: { id: best.id, name: best.name, type: best.type, value: best.value },
      offers,
    };
  }

  async getLoyaltyCampaign() {
    const settings = await this.parametersService.loyaltySettings();
    const holders = await this.prisma.user.findMany({
      where: { role: Role.customer, loyaltyStamps: { gt: 0 } },
      select: { id: true, name: true, email: true, loyaltyStamps: true },
      orderBy: [{ loyaltyStamps: 'desc' }, { name: 'asc' }],
    });
    return {
      ...settings,
      holders: holders.map((holder) => ({
        userId: holder.id,
        name: holder.name,
        email: holder.email,
        stamps: holder.loyaltyStamps,
      })),
      limits: {
        ordersRequired: {
          min: PARAMETERS.loyalty_orders_required.min,
          max: PARAMETERS.loyalty_orders_required.max,
        },
        minOrderAmount: {
          min: PARAMETERS.loyalty_min_order_amount.min,
          max: PARAMETERS.loyalty_min_order_amount.max,
        },
        discountPercent: {
          min: PARAMETERS.loyalty_discount_percent.min,
          max: PARAMETERS.loyalty_discount_percent.max,
        },
      },
    };
  }

  async startLoyaltyCampaign() {
    await this.parametersService.setLoyaltyCampaignActive(true);
    return this.getLoyaltyCampaign();
  }

  async finishLoyaltyCampaign() {
    await this.parametersService.setLoyaltyCampaignActive(false);
    return this.getLoyaltyCampaign();
  }

  async updateLoyaltyCampaign(dto: UpdateLoyaltyCampaignDto) {
    await this.parametersService.update({
      loyalty_orders_required: dto.ordersRequired,
      loyalty_min_order_amount: dto.minOrderAmount,
      loyalty_discount_percent: dto.discountPercent,
    });
    return this.getLoyaltyCampaign();
  }

  async publicSummary(now = new Date()) {
    const [promotions, loyalty, top3Started] = await Promise.all([
      this.prisma.promotion.findMany({
        where: currentWhere(now),
        include: {
          product: {
            select: {
              name: true,
              images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.parametersService.loyaltySettings(),
      this.prisma.parameter.findUnique({ where: { key: TOP3_STARTED_AT_KEY } }),
    ]);
    const top3StartedAt = top3Started?.value ? new Date(top3Started.value) : null;
    const top3Active = !!top3StartedAt && !isNaN(top3StartedAt.getTime());
    return {
      promotions: promotions.map((promotion) => ({
        id: promotion.id,
        name: promotion.name,
        type: promotion.type,
        value: promotion.value,
        productName: promotion.product?.name ?? null,
        productImageUrl: promotion.product?.images[0]?.url ?? null,
        minSubtotal: promotion.minSubtotal == null ? null : Number(promotion.minSubtotal),
        endsAt: promotion.endsAt,
      })),
      loyalty: loyalty.active
        ? {
            ordersRequired: loyalty.ordersRequired,
            minOrderAmount: loyalty.minOrderAmount,
          }
        : null,
      top3: top3Active ? { active: true } : null,
    };
  }

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
    const fields = await this.fieldsFor(
      type,
      dto.value,
      dto.productId,
      type === 'two_for_one' ? null : (dto.minSubtotal ?? null),
    );

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