import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { byName, ExtrasService } from '../extras/extras.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

const withRelations = {
  items: {
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: 'asc' as const }, take: 1 } },
      },
      extras: { include: { extra: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

type CartWithRelations = Prisma.CartGetPayload<{ include: typeof withRelations }>;

function serialize(cart: CartWithRelations) {
  const items = cart.items.map((item) => {
    const unitPrice = Number(item.product.price);
    const extras = item.extras
      .map(({ extra }) => ({
        id: extra.id,
        name: extra.name,
        price: Number(extra.price),
        available: extra.available,
      }))
      .sort(byName);
    const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
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
        available: item.product.available,
        imageUrl: item.product.images[0]?.url ?? '',
      },
    };
  });

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extrasService: ExtrasService,
  ) {}

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return serialize(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.assertAvailableProduct(dto.productId);
    const extras = await this.extrasService.resolve(product, dto.extraIds);
    const cart = await this.getOrCreateCart(userId);

    const notes = dto.notes ?? '';
    // La línea es "producto + adicionales elegidos": misma combinación suma cantidad, otra combinación es otra línea.
    const extrasKey = extras
      .map((extra) => extra.id)
      .sort()
      .join(',');

    await this.prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.upsert({
        where: { cartId_productId_extrasKey: { cartId: cart.id, productId: product.id, extrasKey } },
        create: { cartId: cart.id, productId: product.id, extrasKey, quantity: dto.quantity, notes },
        update: {
          quantity: { increment: dto.quantity },
          ...(dto.notes !== undefined ? { notes } : {}),
        },
      });

      // Los adicionales de una línea no cambian (`extrasKey` garantiza que son los mismos), por eso
      // se insertan aparte y sin duplicar: así el upsert sigue siendo atómico ante doble click.
      if (extras.length > 0) {
        await tx.cartItemExtra.createMany({
          data: extras.map((extra) => ({ cartItemId: item.id, extraId: extra.id })),
          skipDuplicates: true,
        });
      }
    });

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    await this.findOwnedItem(userId, itemId);

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    await this.findOwnedItem(userId, itemId);

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(userId);
  }

  private getOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: withRelations,
    });
  }

  private async findOwnedItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('El ítem no está en el carrito');
    }
    return item;
  }

  private async assertAvailableProduct(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (!product.available) {
      throw new BadRequestException('El producto no está disponible');
    }
    return product;
  }
}
