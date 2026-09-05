import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

const withRelations = {
  items: {
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: 'asc' as const }, take: 1 } },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

type CartWithRelations = Prisma.CartGetPayload<{ include: typeof withRelations }>;

function serialize(cart: CartWithRelations) {
  const items = cart.items.map((item) => {
    const unitPrice = Number(item.product.price);
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      subtotal: unitPrice * item.quantity,
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
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return serialize(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.assertAvailableProduct(dto.productId);
    const cart = await this.getOrCreateCart(userId);

    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      create: { cartId: cart.id, productId: product.id, quantity: dto.quantity },
      update: { quantity: { increment: dto.quantity } },
    });

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    await this.findOwnedItem(userId, itemId);

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
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
