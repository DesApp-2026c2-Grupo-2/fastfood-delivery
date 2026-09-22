import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Los adicionales son productos de la categoría "Adicional" y se ofrecen en los de "Hamburguesas".
// Se buscan por slug, que se conserva al renombrar una categoría.
export const EXTRAS_CATEGORY_SLUG = 'adicional';
export const EXTRAS_HOST_CATEGORY_SLUG = 'hamburguesas';

export type ExtraOption = { id: string; name: string; price: number };

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

  /** Adicionales que se pueden elegir en un producto. Vacío si el producto no admite adicionales. */
  async listFor(productId: string): Promise<ExtraOption[]> {
    if (!(await this.acceptsExtras(productId))) {
      return [];
    }

    const extras = await this.prisma.product.findMany({
      where: {
        available: true,
        id: { not: productId },
        categories: { some: { slug: EXTRAS_CATEGORY_SLUG } },
      },
      select: { id: true, name: true, price: true },
    });
    return extras.map(toOption).sort(byName);
  }

  /**
   * Valida los adicionales elegidos para un producto y los devuelve. Sin `extraIds` devuelve [].
   * Responde 400 si el producto no admite adicionales o si alguno no existe, no es un adicional
   * o no está disponible.
   */
  async resolve(
    product: { id: string; name: string },
    extraIds: string[] | undefined,
  ): Promise<ExtraOption[]> {
    const ids = [...new Set(extraIds ?? [])];
    if (ids.length === 0) {
      return [];
    }
    if (!(await this.acceptsExtras(product.id))) {
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
      if (!extra.available) {
        throw new BadRequestException(`"${extra.name}" no está disponible`);
      }
      return toOption(extra);
    });
  }

  private async acceptsExtras(productId: string) {
    const count = await this.prisma.product.count({
      where: { id: productId, categories: { some: { slug: EXTRAS_HOST_CATEGORY_SLUG } } },
    });
    return count > 0;
  }
}
