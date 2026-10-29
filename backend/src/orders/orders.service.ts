import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Fulfillment, OrderStatus, Prisma } from '@prisma/client';
import { AddressesService } from '../addresses/addresses.service';
import { JwtPayload } from '../auth/jwt-payload';
import { BranchesService } from '../branches/branches.service';
import { CartService } from '../cart/cart.service';
import { DeliveryFeesService, feeForDistance } from '../delivery-fees/delivery-fees.service';
import { byName, ExtrasService } from '../extras/extras.service';
import { ParametersService } from '../parameters/parameters.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionLine, PromotionsService } from '../promotions/promotions.service';
import { stockLines } from '../stock/stock-lines';
import { StockService } from '../stock/stock.service';
import { CheckoutBranchesDto } from './dto/checkout-branches.dto';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { QuotePromotionDto } from './dto/quote-promotion.dto';
import { deliveryTiming, estimateDeliveryAt } from './eta';
import { OrderEvents } from './order-events';
import { canTransition, nextStatuses } from './order-status';

const withRelations = {
  branch: true,
  address: true,
  promotion: { select: { type: true, value: true } },
  items: {
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: 'asc' as const }, take: 1 } },
      },
      extras: true,
    },
  },
};

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof withRelations }>;

function sumPrices(prices: Array<Prisma.Decimal | number>) {
  return prices.reduce<number>((sum, price) => sum + Number(price), 0);
}

type PricedLine = {
  product: { id: string; price: Prisma.Decimal };
  quantity: number;
  extras: { price: Prisma.Decimal | number }[];
};

function promotionLines(lines: PricedLine[]): PromotionLine[] {
  return lines.map((line) => ({
    productId: line.product.id,
    quantity: line.quantity,
    unitPrice: Number(line.product.price),
  }));
}

// Subtotal de lista: Σ (precio del producto + Σ adicionales) × cantidad. La promo se descuenta sobre esto.
function linesSubtotal(lines: PricedLine[]) {
  return lines.reduce((sum, line) => {
    const extrasTotal = sumPrices(line.extras.map((extra) => extra.price));
    return sum + (Number(line.product.price) + extrasTotal) * line.quantity;
  }, 0);
}

type CartWithItems = {
  items: {
    product: { id: string; name: string; price: Prisma.Decimal };
    quantity: number;
    extras: { extra: { id: string; name: string; price: Prisma.Decimal } }[];
  }[];
};

function cartLines(cart: CartWithItems) {
  return cart.items.map((item) => ({
    product: item.product,
    quantity: item.quantity,
    extras: item.extras.map(({ extra }) => extra),
  }));
}

<<<<<<< HEAD
// Importes del pedido. Mantiene la firma esperada por las suites de pruebas de ciclo de vida.
=======
// Importes del pedido. Los pedidos anteriores a las promos tienen subtotal = total y descuento 0;
// los anteriores al costo de envío, y los de retiro, tienen envío 0.
>>>>>>> 932a15cdcc68e266171fd8814719fa3b3f27b57a
function pricing(order: {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  promotionName: string | null;
}) {
  return {
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    deliveryFee: Number(order.deliveryFee),
    totalAmount: Number(order.totalAmount),
    promotionName: order.promotionName,
  };
}

const adminDetailInclude = {
  user: { select: { id: true, name: true, email: true } },
  promotion: { select: { type: true, value: true } },
  branch: true,
  address: true,
  items: {
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: 'asc' as const }, take: 1 } },
      },
      extras: true,
    },
  },
  statusHistory: {
    orderBy: { changedAt: 'asc' as const },
    include: { changedBy: { select: { name: true, email: true } } },
  },
};

type OrderAdminDetail = Prisma.OrderGetPayload<{ include: typeof adminDetailInclude }>;

// En los listados solo hace falta saber cuándo se entregó, para la demora.
const deliveredEvent = {
  where: { status: OrderStatus.delivered },
  select: { status: true, changedAt: true },
};

const ADMIN_ORDER_PAGE_SIZE = 20;

function parseDayAR(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException('Fecha inválida');
  }
  return date;
}

function startOfDayAR(date: string): Date {
  return new Date(`${parseDayAR(date)}T00:00:00.000-03:00`);
}

function endOfDayAR(date: string): Date {
  return new Date(`${parseDayAR(date)}T23:59:59.999-03:00`);
}

function buildAdminOrderWhere(query: {
  status?: OrderStatus;
  code?: string;
  customer?: string;
  from?: string;
  to?: string;
}): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];

  if (query.status) {
    and.push({ status: query.status });
  }

  const code = query.code?.trim().replace(/^#/, '').toLowerCase();
  if (code) {
    and.push({ id: { contains: code, mode: 'insensitive' } });
  }

  const customer = query.customer?.trim();
  if (customer) {
    and.push({
      OR: [
        { guestName: { contains: customer, mode: 'insensitive' } },
        { guestEmail: { contains: customer, mode: 'insensitive' } },
        { user: { name: { contains: customer, mode: 'insensitive' } } },
        { user: { email: { contains: customer, mode: 'insensitive' } } },
      ],
    });
  }

  const from = query.from?.trim();
  const to = query.to?.trim();
  if (from && to && from > to) {
    throw new BadRequestException('El rango de fechas es inválido');
  }
  if (from || to) {
    and.push({
      createdAt: {
        ...(from ? { gte: startOfDayAR(from) } : {}),
        ...(to ? { lte: endOfDayAR(to) } : {}),
      },
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

function serializeItems(items: OrderWithRelations['items']) {
  return items.map((item) => {
    const unitPrice = Number(item.unitPrice);
    const extras = item.extras
      .map((extra) => ({
        id: extra.extraId,
        name: extra.name,
        price: Number(extra.price),
      }))
      .sort(byName);
    const extrasTotal = sumPrices(extras.map((extra) => extra.price));
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      notes: item.notes,
      unitPrice,
      extras,
      extrasTotal,
      subtotal: (unitPrice + extrasTotal) * item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        imageUrl: item.product.images[0]?.url ?? '',
      },
    };
  });
}

function serialize(order: OrderWithRelations) {
  return {
    id: order.id,
    status: order.status,
    ...pricing(order),
    createdAt: order.createdAt,
    branch: {
      id: order.branch.id,
      name: order.branch.name,
      address: order.branch.address,
    },
    fulfillment: order.fulfillment,
    // En retiro no hay dirección.
    address: order.address
      ? { id: order.address.id, alias: order.address.alias, street: order.address.street }
      : null,
    guestName: order.guestName,
    guestEmail: order.guestEmail,
    items: serializeItems(order.items),
    ...deliveryTiming(order),
  };
}

function serializeAdmin(order: OrderAdminDetail) {
  return {
    id: order.id,
    status: order.status,
    ...pricing(order),
    createdAt: order.createdAt,
    customerName: order.user?.name ?? order.guestName ?? 'Invitado',
    customerEmail: order.user?.email ?? order.guestEmail ?? '',
    user: order.user,
    guestName: order.guestName,
    guestEmail: order.guestEmail,
    branch: {
      id: order.branch.id,
      name: order.branch.name,
      address: order.branch.address,
    },
    fulfillment: order.fulfillment,
    // En retiro no hay dirección.
    address: order.address
      ? { id: order.address.id, alias: order.address.alias, street: order.address.street }
      : null,
    items: serializeItems(order.items),
    history: order.statusHistory.map((event) => ({
      id: event.id,
      status: event.status,
      changedAt: event.changedAt,
      changedByName: event.changedBy?.name ?? 'Sistema',
    })),
    ...deliveryTiming(order),
    nextStatuses: nextStatuses(order.status),
  };
}

const customerDetailInclude = {
  ...withRelations,
  statusHistory: { orderBy: { changedAt: 'asc' as const } },
};

type OrderCustomerDetail = Prisma.OrderGetPayload<{ include: typeof customerDetailInclude }>;

function serializeCustomer(order: OrderCustomerDetail) {
  return {
    ...serialize(order),
    history: order.statusHistory.map((event) => ({
      id: event.id,
      status: event.status,
      changedAt: event.changedAt,
    })),
    ...deliveryTiming(order),
    canCancel: canTransition(order.status, OrderStatus.cancelled),
  };
}

export type RepeatSkipped = {
  kind: 'product' | 'extra';
  name: string;
  message: string;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addressesService: AddressesService,
    private readonly branchesService: BranchesService,
    private readonly cartService: CartService,
    private readonly deliveryFeesService: DeliveryFeesService,
    private readonly extrasService: ExtrasService,
    private readonly orderEvents: OrderEvents,
    private readonly parametersService: ParametersService,
    private readonly promotionsService: PromotionsService,
    private readonly stockService: StockService,
  ) {}

  async createFromCart(userId: string, dto: CreateOrderDto) {
    // Retiro no lleva dirección: aunque llegue un addressId, el pedido queda sin ella.
    const address =
      dto.fulfillment === Fulfillment.delivery
        ? await this.addressesService.findOneForUser(userId, dto.addressId as string)
        : null;
    const cart = await this.loadCart(userId);

    const { branch, distanceKm } = await this.branchesService.resolveChosen(
      dto.branchId,
      dto.fulfillment,
      address ? { latitude: Number(address.latitude), longitude: Number(address.longitude) } : null,
    );
    const lines = cartLines(cart);
    const createdAt = new Date();
<<<<<<< HEAD
    // La promo vigente contempla promociones generales, podio Top 3 y premio por fidelidad.
    const price = await this.promotionsService.apply(
      linesSubtotal(lines),
      promotionLines(lines),
      createdAt,
      userId,
    );
=======
    // La promo vigente se aplica al confirmar (HU-21); no depende de la sucursal ni del tipo de entrega.
    const price = await this.promotionsService.apply(linesSubtotal(lines), promotionLines(lines), createdAt);
    const deliveryFee = await this.deliveryFeesService.feeFor(dto.fulfillment, distanceKm);
>>>>>>> 932a15cdcc68e266171fd8814719fa3b3f27b57a
    const estimatedDeliveryAt = estimateDeliveryAt(
      createdAt,
      cart.items.reduce((sum, item) => sum + item.quantity, 0),
      distanceKm,
      await this.parametersService.etaSettings(),
    );
    const units = stockLines(lines);

    const order = await this.prisma.$transaction(async (tx) => {
      // Sin stock suficiente sale un 409 y no se crea el pedido; el carrito queda como estaba.
      await this.stockService.reserve(tx, branch, units);

      const created = await tx.order.create({
        data: {
          userId,
          branchId: branch.id,
          fulfillment: dto.fulfillment,
          addressId: address?.id ?? null,
          ...this.priceData(price, deliveryFee),
          status: 'pending',
          createdAt,
          estimatedDeliveryAt,
          stockReserved: true,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.price,
              notes: item.notes,
              extras: {
                create: item.extras.map(({ extra }) => ({
                  extraId: extra.id,
                  name: extra.name,
                  price: extra.price,
                })),
              },
            })),
          },
        },
        include: withRelations,
      });

      await tx.orderStatusHistory.create({
        data: { orderId: created.id, status: 'pending', changedByUserId: userId },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      const usedTopBuyerReward = price.promotion?.id === 'loyalty-top-3-buyer';

      // Incrementa el sello de fidelidad y consume el premio de Top Comprador si fue utilizado
      await tx.user.update({
        where: { id: userId },
        data: {
          loyaltyStamps: { increment: 1 },
          ...(usedTopBuyerReward ? { hasTopBuyerReward: false } : {}),
        },
      });

      return created;
    });

    return serialize(order);
  }

  async createGuest(dto: CreateGuestOrderDto) {
    const lines = await this.resolveLines(dto.items);
    const delivery = dto.fulfillment === Fulfillment.delivery;
    const { branch, distanceKm } = await this.branchesService.resolveChosen(
      dto.branchId,
      dto.fulfillment,
      delivery ? { latitude: dto.latitude as number, longitude: dto.longitude as number } : null,
    );
    const createdAt = new Date();
    const price = await this.promotionsService.apply(linesSubtotal(lines), promotionLines(lines), createdAt);
    const deliveryFee = await this.deliveryFeesService.feeFor(dto.fulfillment, distanceKm);
    const estimatedDeliveryAt = estimateDeliveryAt(
      createdAt,
      lines.reduce((sum, line) => sum + line.quantity, 0),
      distanceKm,
      await this.parametersService.etaSettings(),
    );

    const order = await this.prisma.$transaction(async (tx) => {
      await this.stockService.reserve(tx, branch, stockLines(lines));

      const address = delivery
        ? await tx.address.create({
            data: {
              street: (dto.street as string).trim(),
              latitude: dto.latitude as number,
              longitude: dto.longitude as number,
              isDefault: true,
            },
          })
        : null;

      const created = await tx.order.create({
        data: {
          guestName: dto.name.trim(),
          guestEmail: dto.email.trim().toLowerCase(),
          branchId: branch.id,
          fulfillment: dto.fulfillment,
          addressId: address?.id ?? null,
          ...this.priceData(price, deliveryFee),
          status: 'pending',
          createdAt,
          estimatedDeliveryAt,
          stockReserved: true,
          items: {
            create: lines.map((line) => ({
              productId: line.product.id,
              quantity: line.quantity,
              unitPrice: line.product.price,
              notes: line.notes,
              extras: {
                create: line.extras.map((extra) => ({
                  extraId: extra.id,
                  name: extra.name,
                  price: extra.price,
                })),
              },
            })),
          },
        },
        include: withRelations,
      });

      await tx.orderStatusHistory.create({
        data: { orderId: created.id, status: 'pending' },
      });

      return created;
    });

    return serialize(order);
  }

  /**
   * Sucursales entre las que el cliente puede elegir para este carrito (HU-23), primero las que tienen
   * stock de todo (producto y adicionales) y después, de la más cercana a la más lejana.
   * Domicilio: solo activas dentro del radio de la dirección. Retiro: todas las activas.
   */
  async listBranchesForCheckout(dto: CheckoutBranchesDto, user?: JwtPayload) {
    const units = stockLines(await this.checkoutLines(dto, user));

    const hasOrigin = dto.addressId !== undefined || dto.latitude !== undefined || dto.longitude !== undefined;
    const origin = hasOrigin
      ? await this.branchesService.resolveOrigin(
          { addressId: dto.addressId, lat: dto.latitude, lng: dto.longitude },
          user,
        )
      : null;
    if (dto.fulfillment === Fulfillment.delivery && !origin) {
      throw new BadRequestException('Indicá la dirección de entrega');
    }

    const { radiusKm, branches } = await this.branchesService.findActiveByDistance(origin);
    const offered =
      dto.fulfillment === Fulfillment.delivery ? branches.filter((entry) => entry.withinRadius) : branches;
    const shortages = await this.stockService.shortagesByBranch(
      offered.map(({ branch }) => branch.id),
      units,
    );
    const pricePerKm = dto.fulfillment === Fulfillment.delivery ? await this.deliveryFeesService.pricePerKm() : 0;

    const rows = offered.map(({ branch, distanceKm, withinRadius }) => {
      const missing = shortages.get(branch.id) ?? [];
      return {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        openingHours: branch.openingHours,
        latitude: Number(branch.latitude),
        longitude: Number(branch.longitude),
        distanceKm: distanceKm === null ? null : Math.round(distanceKm * 100) / 100,
        withinRadius,
        // Lo que se cobraría de envío desde esta sucursal. En domicilio siempre hay distancia; retiro, 0.
        deliveryFee: distanceKm === null ? 0 : feeForDistance(pricePerKm, distanceKm),
        canFulfill: missing.length === 0,
        missing: missing.map((line) => ({
          productId: line.productId,
          name: line.name,
          requested: line.quantity,
          available: line.available,
        })),
      };
    });
    rows.sort((a, b) => Number(b.canFulfill) - Number(a.canFulfill));

    return { fulfillment: dto.fulfillment, radiusKm, branches: rows };
  }

  /**
   * Subtotal, descuento y total antes de confirmar (HU-21), contemplando promociones y beneficios por fidelidad.
   */
  async quote(dto: QuotePromotionDto, user?: JwtPayload) {
    const lines = await this.checkoutLines(dto, user);
    return this.promotionsService.apply(
      linesSubtotal(lines),
      promotionLines(lines),
      new Date(),
      user?.sub,
    );
  }

  async findAllAdmin(query: {
    status?: OrderStatus;
    code?: string;
    customer?: string;
    from?: string;
    to?: string;
    page?: string | number;
  }) {
    const { status } = query;
    if (status && !Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException('Estado inválido');
    }

    const where = buildAdminOrderWhere(query);
    const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
    const skip = (page - 1) * ADMIN_ORDER_PAGE_SIZE;

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: ADMIN_ORDER_PAGE_SIZE,
        include: {
          user: { select: { name: true, email: true } },
          promotion: { select: { type: true, value: true } },
          branch: { select: { id: true, name: true } },
          items: true,
          statusHistory: deliveredEvent,
        },
      }),
    ]);

    return {
      items: orders.map((order) => ({
        id: order.id,
        status: order.status,
        fulfillment: order.fulfillment,
        ...pricing(order),
        createdAt: order.createdAt,
        customerName: order.user?.name ?? order.guestName ?? 'Invitado',
        customerEmail: order.user?.email ?? order.guestEmail ?? '',
        branch: order.branch,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        ...deliveryTiming(order),
        nextStatuses: nextStatuses(order.status),
      })),
      total,
      page,
      pageSize: ADMIN_ORDER_PAGE_SIZE,
    };
  }

  async findOneAdmin(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: adminDetailInclude,
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return serializeAdmin(order);
  }

  async changeStatus(id: string, status: OrderStatus, adminUserId: string) {
    await this.transition(id, status, adminUserId);
    return this.findOneAdmin(id);
  }

  async findAllForUser(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        promotion: { select: { type: true, value: true } },
        branch: { select: { id: true, name: true } },
        items: { select: { quantity: true } },
        statusHistory: deliveredEvent,
      },
    });

    return orders.map((order) => ({
      id: order.id,
      status: order.status,
      fulfillment: order.fulfillment,
      ...pricing(order),
      createdAt: order.createdAt,
      branch: order.branch,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      ...deliveryTiming(order),
    }));
  }

  async findOneForUser(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: customerDetailInclude,
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return serializeCustomer(order);
  }

  async cancelForUser(userId: string, id: string) {
    await this.assertOwnedByUser(userId, id);
    await this.transition(id, OrderStatus.cancelled, userId);
    return this.findOneForUser(userId, id);
  }

  async repeatForUser(userId: string, id: string) {
    await this.assertOwnedByUser(userId, id);
    const items = await this.prisma.orderItem.findMany({
      where: { orderId: id },
      orderBy: { id: 'asc' },
      include: {
        product: { select: { id: true, name: true, available: true } },
        extras: { include: { extra: { select: { id: true, name: true, available: true } } } },
      },
    });

    const skipped: RepeatSkipped[] = [];
    for (const item of items) {
      if (!item.product.available) {
        skipped.push({
          kind: 'product',
          name: item.product.name,
          message: `"${item.product.name}" ya no está disponible y no se agregó`,
        });
        continue;
      }

      const extraIds: string[] = [];
      for (const { extra } of item.extras) {
        if (extra.available) {
          extraIds.push(extra.id);
        } else {
          skipped.push({
            kind: 'extra',
            name: extra.name,
            message: `"${extra.name}" ya no está disponible: "${item.product.name}" se agregó sin ese adicional`,
          });
        }
      }

      try {
        await this.cartService.addItem(userId, {
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes || undefined,
          extraIds,
        });
      } catch (error) {
        if (!(error instanceof BadRequestException || error instanceof NotFoundException)) {
          throw error;
        }
        skipped.push({ kind: 'product', name: item.product.name, message: error.message });
      }
    }

    return { cart: await this.cartService.getCart(userId), skipped };
  }

  private async checkoutLines(dto: { items?: CheckoutBranchesDto['items'] }, user?: JwtPayload) {
    if (dto.items) {
      return this.resolveLines(dto.items);
    }
    if (!user) {
      throw new BadRequestException('El carrito está vacío');
    }
    return cartLines(await this.loadCart(user.sub));
  }

<<<<<<< HEAD
  private priceData(price: Awaited<ReturnType<PromotionsService['apply']>>) {
    const isVirtualPromo = price.promotion?.id.startsWith('loyalty-');
    return {
      subtotal: price.subtotal,
      discountAmount: price.discountAmount,
      totalAmount: price.totalAmount,
      promotionId: isVirtualPromo ? null : (price.promotion?.id ?? null),
=======
  // Los importes que se guardan en el pedido. El nombre de la promo se copia. La promo descuenta solo
  // los productos: el envío se suma después.
  private priceData(price: Awaited<ReturnType<PromotionsService['apply']>>, deliveryFee: number) {
    return {
      subtotal: price.subtotal,
      discountAmount: price.discountAmount,
      deliveryFee,
      totalAmount: Math.round((price.totalAmount + deliveryFee) * 100) / 100,
      promotionId: price.promotion?.id ?? null,
>>>>>>> 932a15cdcc68e266171fd8814719fa3b3f27b57a
      promotionName: price.promotion?.name ?? null,
    };
  }

  private async assertOwnedByUser(userId: string, id: string) {
    const owned = await this.prisma.order.count({ where: { id, userId } });
    if (owned === 0) {
      throw new NotFoundException('Pedido no encontrado');
    }
  }

  private async transition(id: string, status: OrderStatus, changedByUserId: string) {
    const current = await this.prisma.order.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (!canTransition(current.status, status)) {
      throw new ConflictException('No se puede pasar el pedido a ese estado');
    }

    const settlesStock =
      current.stockReserved && (status === OrderStatus.cancelled || status === OrderStatus.delivered);

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: current.status, stockReserved: current.stockReserved },
        data: { status, ...(settlesStock ? { stockReserved: false } : {}) },
      });
      if (count === 0) {
        throw new ConflictException('El pedido cambió de estado; actualizá la página');
      }
      await tx.orderStatusHistory.create({
        data: { orderId: id, status, changedByUserId },
      });

      if (settlesStock) {
        const units = await this.orderStockLines(tx, id);
        if (status === OrderStatus.cancelled) {
          await this.stockService.release(tx, current.branchId, units);
        } else {
          await this.stockService.consume(tx, current.branchId, units);
        }
      }
    });

    await this.orderEvents.notifyStatusChanged({
      orderId: id,
      userId: current.userId,
      status,
      previousStatus: current.status,
      changedAt: new Date().toISOString(),
    });
  }

  private async resolveLines(
    items: { productId: string; quantity: number; notes?: string; extraIds?: string[] }[],
  ) {
    const uniqueIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueIds } },
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    return Promise.all(
      items.map(async (item) => {
        const product = byId.get(item.productId);
        if (!product) {
          throw new NotFoundException('Producto no encontrado');
        }
        if (!product.available) {
          throw new BadRequestException(`"${product.name}" ya no está disponible`);
        }
        return {
          product,
          quantity: item.quantity,
          notes: item.notes?.trim() ?? '',
          extras: await this.extrasService.resolve(product, item.extraIds),
        };
      }),
    );
  }

  private async orderStockLines(tx: Prisma.TransactionClient, orderId: string) {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: {
        quantity: true,
        product: { select: { id: true, name: true } },
        extras: { select: { extraId: true, name: true } },
      },
    });
    return stockLines(
      items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        extras: item.extras.map((extra) => ({ id: extra.extraId, name: extra.name })),
      })),
    );
  }

  private async loadCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, extras: { include: { extra: true } } } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    const unavailable = cart.items.find((item) => !item.product.available);
    if (unavailable) {
      throw new BadRequestException(`"${unavailable.product.name}" ya no está disponible`);
    }
    const unavailableExtra = cart.items
      .flatMap((item) => item.extras)
      .find(({ extra }) => !extra.available);
    if (unavailableExtra) {
      throw new BadRequestException(`"${unavailableExtra.extra.name}" ya no está disponible`);
    }
    return cart;
  }
}