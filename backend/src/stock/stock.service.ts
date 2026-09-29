import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { byName } from '../extras/extras.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockLine } from './stock-lines';

type Shortage = StockLine & { available: number };

function quoteNames(names: string[]) {
  const quoted = names.map((name) => `"${name}"`);
  return quoted.length === 1 ? quoted[0] : `${quoted.slice(0, -1).join(', ')} y ${quoted[quoted.length - 1]}`;
}

/**
 * 409 del checkout sin stock (HU-18). `message` nombra los productos que faltan, listo para mostrar;
 * `items` trae el detalle por si el front quiere marcar cada línea del carrito.
 */
function outOfStock(branch: { id: string; name: string }, shortages: Shortage[]) {
  const onlyOne = shortages.length === 1 ? shortages[0] : null;
  const left = onlyOne && onlyOne.available > 0 ? ` (quedan ${onlyOne.available})` : '';
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code: 'OUT_OF_STOCK',
    message: `No hay stock suficiente de ${quoteNames(shortages.map((line) => line.name))} en ${branch.name}${left}`,
    branch: { id: branch.id, name: branch.name },
    items: shortages.map((line) => ({
      productId: line.productId,
      name: line.name,
      requested: line.quantity,
      available: line.available,
    })),
  });
}

const productForStock = {
  id: true,
  name: true,
  available: true,
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1, select: { url: true } },
  categories: { select: { id: true, name: true, slug: true } },
};

type ProductForStock = Prisma.ProductGetPayload<{ select: typeof productForStock }>;

function serializeStock(
  product: ProductForStock,
  stock: { available: number; reserved: number; updatedAt: Date } | undefined,
) {
  return {
    productId: product.id,
    productName: product.name,
    // Si el producto se ofrece en el catálogo; no tiene que ver con el stock.
    productAvailable: product.available,
    imageUrl: product.images[0]?.url ?? '',
    categories: product.categories,
    // Sin fila de stock el producto está en 0 en esa sucursal.
    available: stock?.available ?? 0,
    reserved: stock?.reserved ?? 0,
    updatedAt: stock?.updatedAt ?? null,
  };
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todos los productos con su stock en la sucursal (HU-17). Los que no tienen fila salen en 0. */
  async listForBranch(branchId: string) {
    await this.findBranch(branchId);
    const products = await this.prisma.product.findMany({
      select: {
        ...productForStock,
        stock: { where: { branchId }, select: { available: true, reserved: true, updatedAt: true } },
      },
    });
    return products.sort(byName).map((product) => serializeStock(product, product.stock[0]));
  }

  async setAvailable(branchId: string, productId: string, available: number) {
    await this.findBranch(branchId);
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: productForStock });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    const stock = await this.prisma.stock.upsert({
      where: { branchId_productId: { branchId, productId } },
      update: { available },
      create: { branchId, productId, available },
    });
    return serializeStock(product, stock);
  }

  /**
   * Verifica y reserva el stock de un pedido nuevo: available -= qty, reserved += qty. Se llama dentro
   * de la transacción que crea el pedido, así un 409 no deja nada a medias.
   */
  async reserve(tx: Prisma.TransactionClient, branch: { id: string; name: string }, lines: StockLine[]) {
    // Primero se revisa todo junto, para nombrar en el 409 todos los productos que faltan.
    const rows = await tx.stock.findMany({
      where: { branchId: branch.id, productId: { in: lines.map((line) => line.productId) } },
      select: { productId: true, available: true },
    });
    const availableById = new Map(rows.map((row) => [row.productId, row.available]));
    const shortages = lines
      .map((line) => ({ ...line, available: availableById.get(line.productId) ?? 0 }))
      .filter((line) => line.available < line.quantity);
    if (shortages.length > 0) {
      throw outOfStock(branch, shortages);
    }

    for (const line of lines) {
      // La condición va en el UPDATE: si otro pedido se llevó las últimas unidades después de la
      // lectura de arriba, no se actualiza nada y este pedido recibe el 409.
      const { count } = await tx.stock.updateMany({
        where: { branchId: branch.id, productId: line.productId, available: { gte: line.quantity } },
        data: { available: { decrement: line.quantity }, reserved: { increment: line.quantity } },
      });
      if (count === 0) {
        const current = await tx.stock.findUnique({
          where: { branchId_productId: { branchId: branch.id, productId: line.productId } },
          select: { available: true },
        });
        throw outOfStock(branch, [{ ...line, available: current?.available ?? 0 }]);
      }
    }
  }

  /** Pedido cancelado: la reserva vuelve a estar disponible. */
  async release(tx: Prisma.TransactionClient, branchId: string, lines: StockLine[]) {
    for (const line of lines) {
      await tx.stock.updateMany({
        where: { branchId, productId: line.productId },
        data: { available: { increment: line.quantity }, reserved: { decrement: line.quantity } },
      });
    }
  }

  /** Pedido entregado: la reserva sale del stock y no vuelve a available. */
  async consume(tx: Prisma.TransactionClient, branchId: string, lines: StockLine[]) {
    for (const line of lines) {
      await tx.stock.updateMany({
        where: { branchId, productId: line.productId },
        data: { reserved: { decrement: line.quantity } },
      });
    }
  }

  private async findBranch(branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }
    return branch;
  }
}
