import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductReports() {
    // 1. Obtener todos los productos activos
    const products = await this.prisma.product.findMany({
      where: { available: true },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 2. Traer el stock registrado para cada producto
    const stocks = await this.prisma.stock.findMany({
      select: {
        productId: true,
        available: true,
      },
    });

    // Mapear el stock disponible total acumulado por producto
    const stockByProduct = new Map<string, number>();
    for (const s of stocks) {
      const current = stockByProduct.get(s.productId) || 0;
      stockByProduct.set(s.productId, current + s.available);
    }

    // 3. Traer todos los OrderItems de pedidos NO cancelados (incluye pending, confirmed, delivered, etc.)
    const validOrderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          status: {
            not: OrderStatus.cancelled,
          },
        },
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
      },
    });

    // 4. Acumular unidades vendidas e ingresos por producto
    const metricsByProduct = new Map<
      string,
      { unitsSold: number; totalRevenue: number }
    >();

    // Inicializamos con todos los productos disponibles (así los de 0 ventas entran en leastSelling)
    for (const product of products) {
      metricsByProduct.set(product.id, { unitsSold: 0, totalRevenue: 0 });
    }

    for (const item of validOrderItems) {
      const current = metricsByProduct.get(item.productId);
      const revenue = Number(item.unitPrice) * item.quantity;
      if (current) {
        current.unitsSold += item.quantity;
        current.totalRevenue += revenue;
      } else {
        // En caso de productos inactivos con pedidos históricos
        metricsByProduct.set(item.productId, {
          unitsSold: item.quantity,
          totalRevenue: revenue,
        });
      }
    }

    // 5. Preparar listas
    const productStats = Array.from(metricsByProduct.entries()).map(
      ([productId, metrics]) => {
        const prod = productMap.get(productId);
        return {
          id: productId,
          name: prod ? prod.name : 'Producto desconocido',
          unitsSold: metrics.unitsSold,
          totalRevenue: Number(metrics.totalRevenue.toFixed(2)),
        };
      },
    );

    // Más vendidos (Top 10)
    const topSelling = [...productStats]
      .filter((p) => p.unitsSold > 0)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);

    // Menos vendidos (menor rotación, incluyendo 0)
    const leastSelling = [...productStats]
      .sort((a, b) => a.unitsSold - b.unitsSold)
      .slice(0, 10);

    // Mayor facturación (Top 10)
    const topRevenue = [...productStats]
      .filter((p) => p.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // En reports.service.ts
// Buscar stocks en 0 de sucursales activas para productos disponibles
const outOfStockEntries = await this.prisma.stock.findMany({
  where: {
    available: { lte: 0 },
    branch: { active: true },
    product: { available: true },
  },
  select: {
    available: true,
    product: {
      select: { id: true, name: true },
    },
    branch: {
      select: { id: true, name: true },
    },
  },
  orderBy: {
    product: { name: 'asc' },
  },
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
}