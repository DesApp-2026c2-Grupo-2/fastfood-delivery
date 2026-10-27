import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryFeeTier, Fulfillment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryFeeTierDto } from './dto/create-delivery-fee-tier.dto';
import { UpdateDeliveryFeeTierDto } from './dto/update-delivery-fee-tier.dto';

export type FeeTier = { upToKm: number; price: number };

const roundKm = (km: number) => Math.round(km * 100) / 100;

/**
 * Envío de un pedido a domicilio. Gana el primer tramo (ordenados por tope) que cubre la distancia; más lejos
 * que el último se cobra el último. Sin tramos, 0. La distancia se redondea a 2 decimales, igual que la que
 * ve el cliente en el checkout, para que el tramo que se muestra sea el que se cobra.
 */
export function feeForDistance(tiers: FeeTier[], distanceKm: number): number {
  if (tiers.length === 0) return 0;
  const km = roundKm(distanceKm);
  const tier = tiers.find((entry) => km <= entry.upToKm) ?? tiers[tiers.length - 1];
  return tier.price;
}

function serialize(tier: DeliveryFeeTier) {
  return {
    id: tier.id,
    upToKm: Number(tier.upToKm),
    price: Number(tier.price),
    updatedAt: tier.updatedAt,
  };
}

@Injectable()
export class DeliveryFeesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Los tramos de menor a mayor, cada uno con el km desde el que arranca. */
  async findAll() {
    const tiers = await this.prisma.deliveryFeeTier.findMany({ orderBy: { upToKm: 'asc' } });
    return tiers.map((tier, index) => ({
      ...serialize(tier),
      fromKm: index === 0 ? 0 : Number(tiers[index - 1].upToKm),
    }));
  }

  async create(dto: CreateDeliveryFeeTierDto) {
    await this.assertUpToKmAvailable(dto.upToKm);
    return serialize(await this.prisma.deliveryFeeTier.create({ data: dto }));
  }

  async update(id: string, dto: UpdateDeliveryFeeTierDto) {
    await this.findTier(id);
    if (dto.upToKm === undefined && dto.price === undefined) {
      throw new BadRequestException('No hay cambios para guardar');
    }
    if (dto.upToKm !== undefined) {
      await this.assertUpToKmAvailable(dto.upToKm, id);
    }
    return serialize(await this.prisma.deliveryFeeTier.update({ where: { id }, data: dto }));
  }

  // Borrar un tramo no toca los pedidos: el envío de cada uno quedó copiado al confirmar.
  async remove(id: string) {
    await this.findTier(id);
    await this.prisma.deliveryFeeTier.delete({ where: { id } });
    return { id };
  }

  /** Sin caché: se leen en cada pedido, así un cambio del admin rige desde el próximo. */
  async tiers(): Promise<FeeTier[]> {
    const rows = await this.prisma.deliveryFeeTier.findMany({ orderBy: { upToKm: 'asc' } });
    return rows.map((row) => ({ upToKm: Number(row.upToKm), price: Number(row.price) }));
  }

  /** Lo que se cobra de envío. Retiro no paga. */
  async feeFor(fulfillment: Fulfillment, distanceKm: number) {
    if (fulfillment === Fulfillment.pickup) return 0;
    return feeForDistance(await this.tiers(), distanceKm);
  }

  private async findTier(id: string) {
    const tier = await this.prisma.deliveryFeeTier.findUnique({ where: { id } });
    if (!tier) {
      throw new NotFoundException('Tramo de envío no encontrado');
    }
    return tier;
  }

  private async assertUpToKmAvailable(upToKm: number, excludeId?: string) {
    const existing = await this.prisma.deliveryFeeTier.findFirst({
      where: { upToKm, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya hay un tramo con ese tope de km');
    }
  }
}
