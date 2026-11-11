import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { ORDER_STATUS_LABEL } from '../orders/order-status';
import { PrismaService } from '../prisma/prisma.service';

export type ReportsQuery = {
  from?: string;
  to?: string;
  branchId?: string;
};

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

function dayKeyAR(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function buildOrderWhere(query: ReportsQuery, opts?: { excludeCancelled?: boolean }): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (opts?.excludeCancelled) {
    and.push({ status: { not: OrderStatus.cancelled } });
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
  const branchId = query.branchId?.trim();
  if (branchId) {
    and.push({ branchId });
  }
  return and.length > 0 ? { AND: and } : {};
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductReports(query: ReportsQuery = {}) {
    const products = await this.prisma.product.findMany({
      where: { available: true },
      select: { id: true, name: true, price: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderWhere = buildOrderWhere(query, { excludeCancelled: true });
    const validOrderItems = await this.prisma.orderItem.findMany({
      where: { order: orderWhere },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
      },
    });

    const metricsByProduct = new Map<string, { unitsSold: number; totalRevenue: number }>();
    for (const product of products) {
      metricsByProduct.set(product.id, { unitsSold: 0, totalRevenue: 0 });
    }

    for (const item of validOrderItems) {
      const revenue = Number(item.unitPrice) * item.quantity;
      const current = metricsByProduct.get(item.productId);
      if (current) {
        current.unitsSold += item.quantity;
        current.totalRevenue += revenue;
      } else {
        metricsByProduct.set(item.productId, {
          unitsSold: item.quantity,
          totalRevenue: revenue,
        });
      }
    }

    const productStats = Array.from(metricsByProduct.entries()).map(([productId, metrics]) => {
      const prod = productMap.get(productId);
      return {
        id: productId,
        name: prod ? prod.name : 'Producto desconocido',
        unitsSold: metrics.unitsSold,
        totalRevenue: Number(metrics.totalRevenue.toFixed(2)),
      };
    });

    const topSelling = [...productStats]
      .filter((p) => p.unitsSold > 0)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);

    const leastSelling = [...productStats].sort((a, b) => a.unitsSold - b.unitsSold).slice(0, 10);

    const topRevenue = [...productStats]
      .filter((p) => p.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    const branchId = query.branchId?.trim();
    const outOfStockEntries = await this.prisma.stock.findMany({
      where: {
        available: { lte: 0 },
        branch: { active: true, ...(branchId ? { id: branchId } : {}) },
        product: { available: true },
      },
      select: {
        available: true,
        product: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });

    const outOfStock = outOfStockEntries.map((entry) => ({
      id: `${entry.product.id}-${entry.branch.id}`,
      name: entry.product.name,
      branchName: entry.branch.name,
      stock: entry.available,
    }));

    return {
      topSelling,
      leastSelling,
      outOfStock,
      topRevenue,
    };
  }

  async getOrderReports(query: ReportsQuery = {}) {
    const where = buildOrderWhere(query);

    // Solo id/name: no pide columnas nuevas de Branch (city/province/CP) y alcanza para el filtro.
    const branches = await this.prisma.branch.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        createdAt: true,
        totalAmount: true,
        discountAmount: true,
        promotionName: true,
        userId: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        statusHistory: {
          where: { status: { in: [OrderStatus.confirmed, OrderStatus.delivered] } },
          select: { status: true, changedAt: true },
          orderBy: { changedAt: 'asc' },
        },
        items: {
          select: {
            productId: true,
            quantity: true,
            product: { select: { name: true } },
          },
        },
      },
    });

    const salesOrders = orders.filter((o) => o.status !== OrderStatus.cancelled);

    const byDay = new Map<string, number>();
    for (const order of orders) {
      const key = dayKeyAR(order.createdAt);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const ordersByDay = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const salesByDayMap = new Map<string, number>();
    for (const order of salesOrders) {
      const key = dayKeyAR(order.createdAt);
      salesByDayMap.set(key, (salesByDayMap.get(key) ?? 0) + Number(order.totalAmount));
    }
    const salesByDay = Array.from(salesByDayMap.entries())
      .map(([date, totalAmount]) => ({ date, totalAmount: Number(totalAmount.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byStatus = new Map<OrderStatus, number>();
    for (const status of Object.values(OrderStatus)) {
      byStatus.set(status, 0);
    }
    for (const order of orders) {
      byStatus.set(order.status, (byStatus.get(order.status) ?? 0) + 1);
    }
    const ordersByStatus = Array.from(byStatus.entries()).map(([status, count]) => ({
      status,
      label: ORDER_STATUS_LABEL[status],
      count,
    }));

    const byBranchCount = new Map<string, { branchId: string; branchName: string; count: number }>();
    for (const order of orders) {
      const current = byBranchCount.get(order.branchId);
      if (current) {
        current.count += 1;
      } else {
        byBranchCount.set(order.branchId, {
          branchId: order.branchId,
          branchName: order.branch.name,
          count: 1,
        });
      }
    }
    const ordersByBranch = Array.from(byBranchCount.values()).sort((a, b) => b.count - a.count);

    const cancelledCount = byStatus.get(OrderStatus.cancelled) ?? 0;
    const totalCount = orders.length;
    const cancelled = {
      count: cancelledCount,
      percent: totalCount === 0 ? 0 : Number(((cancelledCount / totalCount) * 100).toFixed(2)),
    };

    const deliveryMinutes: number[] = [];
    for (const order of orders) {
      const confirmed = order.statusHistory.find((e) => e.status === OrderStatus.confirmed);
      const delivered = order.statusHistory.find((e) => e.status === OrderStatus.delivered);
      if (!confirmed || !delivered) continue;
      const minutes = (delivered.changedAt.getTime() - confirmed.changedAt.getTime()) / 60_000;
      if (minutes >= 0) deliveryMinutes.push(minutes);
    }
    const averageDeliveryMinutes =
      deliveryMinutes.length === 0
        ? null
        : Number((deliveryMinutes.reduce((sum, m) => sum + m, 0) / deliveryMinutes.length).toFixed(2));

    const salesByBranchMap = new Map<string, { branchId: string; branchName: string; totalAmount: number }>();
    for (const order of salesOrders) {
      const amount = Number(order.totalAmount);
      const current = salesByBranchMap.get(order.branchId);
      if (current) {
        current.totalAmount += amount;
      } else {
        salesByBranchMap.set(order.branchId, {
          branchId: order.branchId,
          branchName: order.branch.name,
          totalAmount: amount,
        });
      }
    }
    const salesByBranch = Array.from(salesByBranchMap.values())
      .map((row) => ({ ...row, totalAmount: Number(row.totalAmount.toFixed(2)) }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const productsByBranchMap = new Map<
      string,
      { branchId: string; branchName: string; productId: string; productName: string; unitsSold: number }
    >();
    for (const order of salesOrders) {
      for (const item of order.items) {
        const key = `${order.branchId}:${item.productId}`;
        const current = productsByBranchMap.get(key);
        if (current) {
          current.unitsSold += item.quantity;
        } else {
          productsByBranchMap.set(key, {
            branchId: order.branchId,
            branchName: order.branch.name,
            productId: item.productId,
            productName: item.product.name,
            unitsSold: item.quantity,
          });
        }
      }
    }
    const productsByBranch = Array.from(productsByBranchMap.values()).sort((a, b) => {
      const byBranch = a.branchName.localeCompare(b.branchName, 'es');
      if (byBranch !== 0) return byBranch;
      return b.unitsSold - a.unitsSold;
    });

    const customerMap = new Map<string, { userId: string; name: string; email: string; orderCount: number }>();
    for (const order of salesOrders) {
      if (!order.userId || !order.user) continue;
      const current = customerMap.get(order.userId);
      if (current) {
        current.orderCount += 1;
      } else {
        customerMap.set(order.userId, {
          userId: order.userId,
          name: order.user.name,
          email: order.user.email,
          orderCount: 1,
        });
      }
    }
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    const promoMap = new Map<string, { promotionName: string; orderCount: number; totalDiscount: number }>();
    for (const order of salesOrders) {
      const name = order.promotionName?.trim();
      if (!name) continue;
      const current = promoMap.get(name);
      const discount = Number(order.discountAmount);
      if (current) {
        current.orderCount += 1;
        current.totalDiscount += discount;
      } else {
        promoMap.set(name, {
          promotionName: name,
          orderCount: 1,
          totalDiscount: discount,
        });
      }
    }
    const topPromotions = Array.from(promoMap.values())
      .map((row) => ({ ...row, totalDiscount: Number(row.totalDiscount.toFixed(2)) }))
      .sort((a, b) => b.orderCount - a.orderCount || b.totalDiscount - a.totalDiscount);

    return {
      branches,
      ordersByDay,
      salesByDay,
      ordersByStatus,
      ordersByBranch,
      cancelled,
      averageDeliveryMinutes,
      salesByBranch,
      productsByBranch,
      topCustomers,
      topPromotions,
    };
  }
}
