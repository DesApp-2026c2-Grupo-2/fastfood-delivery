import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Branch, Prisma } from '@prisma/client';
import { AddressesService } from '../addresses/addresses.service';
import { BranchesService } from '../branches/branches.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { haversineDistanceKm } from './geo';

const withRelations = {
  branch: true,
  address: true,
  items: {
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: 'asc' as const }, take: 1 } },
      },
    },
  },
};

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof withRelations }>;

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
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      notes: item.notes,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.unitPrice) * item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        imageUrl: item.product.images[0]?.url ?? '',
      },
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addressesService: AddressesService,
    private readonly branchesService: BranchesService,
  ) {}

  async createFromCart(userId: string, dto: CreateOrderDto) {
    const address = await this.addressesService.findOneForUser(userId, dto.addressId);

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    const unavailable = cart.items.find((item) => !item.product.available);
    if (unavailable) {
      throw new BadRequestException(`"${unavailable.product.name}" ya no está disponible`);
    }

    const branch = await this.assignNearestBranch(Number(address.latitude), Number(address.longitude));
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

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
            })),
          },
        },
        include: withRelations,
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    return serialize(order);
  }

  async createGuest(dto: CreateGuestOrderDto) {
    const lines = await this.resolveLines(dto.items);
    const branch = await this.assignNearestBranch(dto.latitude, dto.longitude);
    const totalAmount = lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          street: dto.street.trim(),
          latitude: dto.latitude,
          longitude: dto.longitude,
          isDefault: true,
        },
      });

      return tx.order.create({
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
            })),
          },
        },
        include: withRelations,
      });
    });

    return serialize(order);
  }

  private async resolveLines(items: { productId: string; quantity: number; notes?: string }[]) {
    const uniqueIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueIds } },
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    return items.map((item) => {
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
      };
    });
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
