import { BadRequestException, Injectable } from '@nestjs/common';
import { Branch, Prisma } from '@prisma/client';
import { AddressesService } from '../addresses/addresses.service';
import { BranchesService } from '../branches/branches.service';
import { PrismaService } from '../prisma/prisma.service';
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
    status: (order as typeof order & { status: string }).status,
    totalAmount: Number((order as OrderWithRelations & { totalAmount: Prisma.Decimal }).totalAmount),
    createdAt: order.createdAt,
    branch: order.branch,
    address: order.address,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
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
