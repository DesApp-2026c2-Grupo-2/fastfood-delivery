import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Branch, OrderStatus, Prisma } from '@prisma/client';
import { AddressesService } from '../addresses/addresses.service';
import { BranchesService } from '../branches/branches.service';
import { CartService } from '../cart/cart.service';
import { byName, ExtrasService } from '../extras/extras.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { haversineDistanceKm } from './geo';
import { OrderEvents } from './order-events';
import { canTransition, nextStatuses } from './order-status';

const withRelations = {
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
};

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof withRelations }>;

function sumPrices(prices: Array<Prisma.Decimal | number>) {
  return prices.reduce<number>((sum, price) => sum + Number(price), 0);
}

const adminDetailInclude = {
  user: { select: { id: true, name: true, email: true } },
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
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
    branch: {
      id: order.branch.id,
      name: order.branch.name,
      address: order.branch.address,
    },
    address: {
      id: order.address.id,
      street: order.address.street,
    },
    guestName: order.guestName,
    guestEmail: order.guestEmail,
    items: serializeItems(order.items),
  };
}

type Coordinates = { latitude: Prisma.Decimal; longitude: Prisma.Decimal };

function etaMinutes(order: {
  status: OrderStatus;
  items: { quantity: number }[];
  address: Coordinates;
  branch: Coordinates;
}): number | null {
  if (order.status === OrderStatus.delivered || order.status === OrderStatus.cancelled) {
    return null;
  }
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const travel = Math.ceil(
    haversineDistanceKm(
      Number(order.address.latitude),
      Number(order.address.longitude),
      Number(order.branch.latitude),
      Number(order.branch.longitude),
    ) / 0.5,
  );
  return 15 + itemCount * 3 + travel;
}

function serializeAdmin(order: OrderAdminDetail) {
  return {
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
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
    address: {
      id: order.address.id,
      street: order.address.street,
    },
    items: serializeItems(order.items),
    history: order.statusHistory.map((event) => ({
      id: event.id,
      status: event.status,
      changedAt: event.changedAt,
      changedByName: event.changedBy?.name ?? 'Sistema',
    })),
    etaMinutes: etaMinutes(order),
    nextStatuses: nextStatuses(order.status),
  };
}

const customerDetailInclude = {
  ...withRelations,
  statusHistory: { orderBy: { changedAt: 'asc' as const } },
};

type OrderCustomerDetail = Prisma.OrderGetPayload<{ include: typeof customerDetailInclude }>;

// Lo mismo que devuelve el checkout, más el seguimiento. El historial no dice quién hizo cada cambio:
// al cliente no se le muestran los nombres de los administradores.
function serializeCustomer(order: OrderCustomerDetail) {
  return {
    ...serialize(order),
    history: order.statusHistory.map((event) => ({
      id: event.id,
      status: event.status,
      changedAt: event.changedAt,
    })),
    etaMinutes: etaMinutes(order),
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
    private readonly extrasService: ExtrasService,
    private readonly orderEvents: OrderEvents,
  ) {}

  async createFromCart(userId: string, dto: CreateOrderDto) {
    const address = await this.addressesService.findOneForUser(userId, dto.addressId);

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

    const branch = await this.assignNearestBranch(Number(address.latitude), Number(address.longitude));
    const totalAmount = cart.items.reduce((sum, item) => {
      const extrasTotal = sumPrices(item.extras.map(({ extra }) => extra.price));
      return sum + (Number(item.product.price) + extrasTotal) * item.quantity;
    }, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          branchId: branch.id,
          addressId: address.id,
          totalAmount,
          status: 'pending',
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

      return created;
    });

    return serialize(order);
  }

  async createGuest(dto: CreateGuestOrderDto) {
    const lines = await this.resolveLines(dto.items);
    const branch = await this.assignNearestBranch(dto.latitude, dto.longitude);
    const totalAmount = lines.reduce((sum, line) => {
      const extrasTotal = sumPrices(line.extras.map((extra) => extra.price));
      return sum + (Number(line.product.price) + extrasTotal) * line.quantity;
    }, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          street: dto.street.trim(),
          latitude: dto.latitude,
          longitude: dto.longitude,
          isDefault: true,
        },
      });

      const created = await tx.order.create({
        data: {
          guestName: dto.name.trim(),
          guestEmail: dto.email.trim().toLowerCase(),
          branchId: branch.id,
          addressId: address.id,
          totalAmount,
          status: 'pending',
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
          branch: { select: { id: true, name: true } },
          items: true,
        },
      }),
    ]);

    return {
      items: orders.map((order) => ({
        id: order.id,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt,
        customerName: order.user?.name ?? order.guestName ?? 'Invitado',
        customerEmail: order.user?.email ?? order.guestEmail ?? '',
        branch: order.branch,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
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

  // Historial del cliente logueado. Los pedidos de invitado no tienen userId y no aparecen.
  async findAllForUser(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        items: { select: { quantity: true } },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      branch: order.branch,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    }));
  }

  async findOneForUser(userId: string, id: string) {
    // Un pedido de otro usuario da 404, igual que uno que no existe: no se revela que el id existe.
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

  /**
   * Suma los ítems de un pedido anterior al carrito, con los precios de hoy; no crea un pedido.
   * Lo que ya no está disponible se omite y se informa en `skipped`.
   */
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
          // Sin observaciones no se pisan las que ya tenga esa línea en el carrito.
          notes: item.notes || undefined,
          extraIds,
        });
      } catch (error) {
        // Por ejemplo, el producto dejó de admitir adicionales. Se omite esa línea y se sigue con el resto.
        if (!(error instanceof BadRequestException || error instanceof NotFoundException)) {
          throw error;
        }
        skipped.push({ kind: 'product', name: item.product.name, message: error.message });
      }
    }

    return { cart: await this.cartService.getCart(userId), skipped };
  }

  private async assertOwnedByUser(userId: string, id: string) {
    const owned = await this.prisma.order.count({ where: { id, userId } });
    if (owned === 0) {
      throw new NotFoundException('Pedido no encontrado');
    }
  }

  // Cambio de estado del admin o del cliente (cancelar): valida el salto, lo guarda en el historial y avisa por Pusher.
  private async transition(id: string, status: OrderStatus, changedByUserId: string) {
    const current = await this.prisma.order.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (!canTransition(current.status, status)) {
      throw new ConflictException('No se puede pasar el pedido a ese estado');
    }

    await this.prisma.$transaction(async (tx) => {
      // Solo actualiza si el estado sigue siendo el leído: si otro lo cambió en el medio
      // (el admin lo pasa a preparación mientras el cliente cancela), gana el primero y el otro recibe 409.
      const { count } = await tx.order.updateMany({
        where: { id, status: current.status },
        data: { status },
      });
      if (count === 0) {
        throw new ConflictException('El pedido cambió de estado; actualizá la página');
      }
      await tx.orderStatusHistory.create({
        data: { orderId: id, status, changedByUserId },
      });
    });

    this.orderEvents.notifyStatusChanged({
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

  private async assignNearestBranch(latitude: number, longitude: number): Promise<Branch> {
    const branches = await this.branchesService.findAll();
    const active = branches.filter((branch) => branch.active);
    if (active.length === 0) {
      throw new BadRequestException('No hay sucursales activas disponibles');
    }

    return active.reduce((closest, branch) => {
      const distance = haversineDistanceKm(latitude, longitude, Number(branch.latitude), Number(branch.longitude));
      const closestDistance = haversineDistanceKm(
        latitude,
        longitude,
        Number(closest.latitude),
        Number(closest.longitude),
      );
      return distance < closestDistance ? branch : closest;
    });
  }
}
