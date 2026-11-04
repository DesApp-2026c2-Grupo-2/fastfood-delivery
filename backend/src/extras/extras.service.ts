import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Los adicionales son productos de la categoría "Adicional". Cada producto ofrece los que el admin
// le marcó (ProductExtra, HU-30). La categoría se busca por slug, que se conserva al renombrarla.
export const EXTRAS_CATEGORY_SLUG = 'adicional';

export type ExtraOption = { id: string; name: string; price: number };
// En el detalle del producto el cliente muestra la foto de cada adicional, como en el carrito.
export type ExtraListing = ExtraOption & { imageUrl: string | null };
export type AdminExtraOption = ExtraOption & { available: boolean; offered: boolean };

const isExtraCategory = { categories: { some: { slug: EXTRAS_CATEGORY_SLUG } } };

function toOption(extra: { id: string; name: string; price: Prisma.Decimal }): ExtraOption {
  return { id: extra.id, name: extra.name, price: Number(extra.price) };
}

/** Orden alfabético sin distinguir mayúsculas ni tildes; el mismo en el catálogo, el carrito y el pedido. */
export function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}

@Injectable()
export class ExtrasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Adicionales que se pueden elegir en un producto: los marcados y disponibles. Vacío si no ofrece ninguno. */
  async listFor(productId: string): Promise<ExtraListing[]> {
    const rows = await this.prisma.productExtra.findMany({
      where: { productId, extra: { available: true, ...isExtraCategory } },
      select: {
        extra: {
          select: {
            id: true,
            name: true,
            price: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          },
        },
      },
    });
    return rows
      .map(({ extra }) => ({ ...toOption(extra), imageUrl: extra.images[0]?.url ?? null }))
      .sort(byName);
  }

  /** Ids de los adicionales marcados en un producto, estén o no disponibles. */
  async offeredIds(productId: string): Promise<Set<string>> {
    const rows = await this.prisma.productExtra.findMany({ where: { productId }, select: { extraId: true } });
    return new Set(rows.map((row) => row.extraId));
  }

  /**
   * Valida los adicionales elegidos para un producto y los devuelve. Sin `extraIds` devuelve [].
   * Responde 400 si el producto no ofrece adicionales, o si alguno no existe, no es un adicional,
   * no está marcado en el producto o no está disponible.
   */
  async resolve(
    product: { id: string; name: string },
    extraIds: string[] | undefined,
  ): Promise<ExtraOption[]> {
    const ids = [...new Set(extraIds ?? [])];
    if (ids.length === 0) {
      return [];
    }
    const offered = await this.offeredIds(product.id);
    if (offered.size === 0) {
      throw new BadRequestException(`"${product.name}" no admite adicionales`);
    }

    const found = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true,
        available: true,
        categories: { select: { slug: true } },
      },
    });
    const byId = new Map(found.map((extra) => [extra.id, extra]));

    return ids.map((id) => {
      const extra = byId.get(id);
      if (!extra) {
        throw new BadRequestException('Adicional no encontrado');
      }
      const isExtra = extra.categories.some((category) => category.slug === EXTRAS_CATEGORY_SLUG);
      if (extra.id === product.id || !isExtra) {
        throw new BadRequestException(`"${extra.name}" no es un adicional`);
      }
      if (!offered.has(extra.id)) {
        throw new BadRequestException(`"${extra.name}" no se ofrece en "${product.name}"`);
      }
      if (!extra.available) {
        throw new BadRequestException(`"${extra.name}" no está disponible`);
      }
      return toOption(extra);
    });
  }

  /**
   * Antes de confirmar: cada adicional de cada línea sigue marcado en su producto.
   * El admin puede desmarcarlo después de que el cliente lo agregó al carrito.
   */
  async assertOffered(lines: { product: { id: string; name: string }; extras: { id: string; name: string }[] }[]) {
    const withExtras = lines.filter((line) => line.extras.length > 0);
    if (withExtras.length === 0) {
      return;
    }
    const rows = await this.prisma.productExtra.findMany({
      where: { productId: { in: withExtras.map((line) => line.product.id) } },
      select: { productId: true, extraId: true },
    });
    const offered = new Set(rows.map((row) => `${row.productId}:${row.extraId}`));
    for (const line of withExtras) {
      const missing = line.extras.find((extra) => !offered.has(`${line.product.id}:${extra.id}`));
      if (missing) {
        throw new BadRequestException(`"${missing.name}" ya no se ofrece en "${line.product.name}"`);
      }
    }
  }

  /** Para el admin: todos los adicionales, con los que este producto ofrece marcados. */
  async listForAdmin(productId: string): Promise<AdminExtraOption[]> {
    await this.findHost(productId);
    const [extras, offered] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { not: productId }, ...isExtraCategory },
        select: { id: true, name: true, price: true, available: true },
      }),
      this.offeredIds(productId),
    ]);
    return extras
      .map((extra) => ({ ...toOption(extra), available: extra.available, offered: offered.has(extra.id) }))
      .sort(byName);
  }

  /** Reemplaza los adicionales que ofrece un producto. Una lista vacía deja de ofrecer adicionales. */
  async setOffered(productId: string, extraIds: string[]): Promise<AdminExtraOption[]> {
    const host = await this.findHost(productId);
    const ids = [...new Set(extraIds)];
    // Vaciar la lista sí se puede: un producto que pasó a ser adicional deja de ofrecer los que tenía.
    if (ids.length > 0 && host.categories.some((category) => category.slug === EXTRAS_CATEGORY_SLUG)) {
      throw new BadRequestException('Un adicional no ofrece adicionales');
    }

    const found = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, categories: { select: { slug: true } } },
    });
    const byId = new Map(found.map((extra) => [extra.id, extra]));
    for (const id of ids) {
      const extra = byId.get(id);
      if (!extra) {
        throw new BadRequestException('Adicional no encontrado');
      }
      if (!extra.categories.some((category) => category.slug === EXTRAS_CATEGORY_SLUG)) {
        throw new BadRequestException(`"${extra.name}" no es un adicional`);
      }
    }

    await this.prisma.$transaction([
      this.prisma.productExtra.deleteMany({ where: { productId } }),
      this.prisma.productExtra.createMany({ data: ids.map((extraId) => ({ productId, extraId })) }),
    ]);
    return this.listForAdmin(productId);
  }

  private async findHost(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, categories: { select: { slug: true } } },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }
}
