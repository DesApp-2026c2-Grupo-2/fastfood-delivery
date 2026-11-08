import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IncidentReason, IncidentStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { serializeIncident } from './serialize-incident';

const adminInclude = {
  order: {
    select: {
      id: true,
      code: true,
      fulfillment: true,
      totalAmount: true,
      branch: { select: { id: true, name: true } },
    },
  },
  user: { select: { name: true, email: true } },
};

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** El cliente reporta un problema. Uno por pedido, solo del suyo y solo si se entregó o retiró. */
  async create(userId: string, orderId: string, dto: CreateIncidentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true, status: true, incident: { select: { id: true } } },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (order.status !== OrderStatus.delivered) {
      throw new ConflictException('Solo podés reportar un problema en un pedido entregado o retirado');
    }
    if (order.incident) {
      throw new ConflictException('Ya reportaste un problema con este pedido');
    }
    const message = dto.message?.trim() ?? '';
    if (dto.reason === IncidentReason.other && !message) {
      throw new BadRequestException('Contanos qué pasó');
    }

    const created = await this.prisma.incident.create({
      data: { orderId: order.id, userId, reason: dto.reason, message },
    });
    return serializeIncident(created);
  }

  /** Listado del admin: abiertas primero (el enum declara open antes que resolved) y, dentro de cada grupo, las más nuevas. */
  async listAdmin(status?: IncidentStatus) {
    if (status && !Object.values(IncidentStatus).includes(status)) {
      throw new BadRequestException('Estado inválido');
    }
    const rows = await this.prisma.incident.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: adminInclude,
    });
    return rows.map((row) => ({
      ...serializeIncident(row),
      orderId: row.orderId,
      orderCode: row.order.code,
      fulfillment: row.order.fulfillment,
      totalAmount: Number(row.order.totalAmount),
      branch: row.order.branch,
      customerName: row.user.name,
      customerEmail: row.user.email,
    }));
  }

  async update(id: string, dto: UpdateIncidentDto) {
    const found = await this.prisma.incident.findUnique({ where: { id } });
    if (!found) {
      throw new NotFoundException('Reclamo no encontrado');
    }
    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        status: dto.status,
        resolvedAt: dto.status === IncidentStatus.resolved ? (found.resolvedAt ?? new Date()) : null,
      },
    });
    return serializeIncident(updated);
  }
}