import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const CUSTOMER_PAGE_SIZE = 20;
const RECENT_ORDERS = 20;

const customerSelect = { id: true, name: true, email: true, active: true, createdAt: true };

type CustomerRow = { id: string; name: string; email: string; active: boolean; createdAt: Date };

// Lo que cuenta como compra: cualquier pedido que no se canceló.
const purchased = { status: { not: OrderStatus.cancelled } } satisfies Prisma.OrderWhereInput;

type Stats = { orderCount: number; totalSpent: number; lastOrderAt: Date | null };

const NO_STATS: Stats = { orderCount: 0, totalSpent: 0, lastOrderAt: null };

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Clientes registrados. `withOrders=true` deja solo los que compraron; `active=true|false` filtra por
   * estado; `q` busca en nombre y email. Los invitados no son usuarios y no aparecen.
   */
  async findAll(query: { q?: string; withOrders?: string; active?: string; page?: string | number }) {
    const where: Prisma.UserWhereInput = { role: Role.customer };
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (query.withOrders === 'true') {
      where.orders = { some: purchased };
    }
    if (query.active !== undefined) {
      if (query.active !== 'true' && query.active !== 'false') {
        throw new BadRequestException('active debe ser true o false');
      }
      where.active = query.active === 'true';
    }

    const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
    const [total, customers] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * CUSTOMER_PAGE_SIZE,
        take: CUSTOMER_PAGE_SIZE,
        select: customerSelect,
      }),
    ]);
    const stats = await this.stats(customers.map((customer) => customer.id));

    return {
      items: customers.map((customer) => this.serialize(customer, stats.get(customer.id))),
      total,
      page,
      pageSize: CUSTOMER_PAGE_SIZE,
    };
  }

  async findOne(id: string) {
    const customer = await this.findCustomer(id);
    const [stats, addresses, orders] = await Promise.all([
      this.stats([id]),
      this.prisma.address.findMany({
        where: { userId: id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, alias: true, street: true, isDefault: true },
      }),
      this.prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: RECENT_ORDERS,
        select: {
          id: true,
          status: true,
          fulfillment: true,
          totalAmount: true,
          createdAt: true,
          branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      ...this.serialize(customer, stats.get(id)),
      addresses,
      recentOrders: orders.map((order) => ({ ...order, totalAmount: Number(order.totalAmount) })),
    };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.findCustomer(id);
    if (dto.name === undefined && dto.email === undefined) {
      throw new BadRequestException('No hay cambios para guardar');
    }
    if (dto.email && dto.email !== customer.email) {
      await this.assertEmailAvailable(dto.email, id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
      },
      select: customerSelect,
    });
    return this.serialize(updated, (await this.stats([id])).get(id));
  }

  // Baja lógica: los pedidos, direcciones e historial quedan; el cliente deja de poder entrar.
  async setActive(id: string, active: boolean) {
    await this.findCustomer(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { active },
      select: customerSelect,
    });
    return this.serialize(updated, (await this.stats([id])).get(id));
  }

  private async stats(userIds: string[]) {
    if (userIds.length === 0) {
      return new Map<string, Stats>();
    }
    const rows = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, ...purchased },
      _count: { _all: true },
      _sum: { totalAmount: true },
      _max: { createdAt: true },
    });
    return new Map<string, Stats>(
      rows.map((row) => [
        row.userId as string,
        {
          orderCount: row._count._all,
          totalSpent: Number(row._sum.totalAmount ?? 0),
          lastOrderAt: row._max.createdAt,
        },
      ]),
    );
  }

  private async findCustomer(id: string) {
    const customer = await this.prisma.user.findFirst({
      where: { id, role: Role.customer },
      select: customerSelect,
    });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return customer;
  }

  // El email no se repite entre clientes y admins (D9).
  private async assertEmailAvailable(email: string, excludeId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, NOT: { id: excludeId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }
  }

  private serialize(customer: CustomerRow, stats: Stats = NO_STATS) {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      active: customer.active,
      createdAt: customer.createdAt,
      ...stats,
    };
  }
}
