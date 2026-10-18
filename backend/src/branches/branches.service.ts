import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Branch, Fulfillment, Prisma } from '@prisma/client';
import { AddressesService } from '../addresses/addresses.service';
import { JwtPayload } from '../auth/jwt-payload';
import { haversineDistanceKm } from '../orders/geo';
import { ParametersService } from '../parameters/parameters.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvailableBranchesQueryDto } from './dto/available-branches-query.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { GeocodeNotFoundError, GeocodeUnavailableError, geocodeAddress } from './geocode';

export type CoveringBranch = { branch: Branch; distanceKm: number };

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addressesService: AddressesService,
    private readonly parametersService: ParametersService,
  ) {}

  /**
   * Sucursales activas dentro del radio de cobertura (parámetro coverage_radius_km), de la más cercana
   * a la más lejana. La primera es la que se asigna al confirmar un pedido en ese punto.
   */
  async findCovering(latitude: number, longitude: number) {
    const [radiusKm, active] = await Promise.all([
      this.parametersService.coverageRadiusKm(),
      this.prisma.branch.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    ]);
    const branches: CoveringBranch[] = active
      .map((branch) => ({
        branch,
        distanceKm: haversineDistanceKm(latitude, longitude, Number(branch.latitude), Number(branch.longitude)),
      }))
      .filter(({ distanceKm }) => distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return { radiusKm, branches };
  }

  /**
   * Todas las sucursales activas, de la más cercana a la más lejana. Sin ubicación no hay distancia
   * y quedan por nombre. `withinRadius` dice si llegan a esa ubicación (null si no se sabe).
   */
  async findActiveByDistance(origin: { latitude: number; longitude: number } | null) {
    const [radiusKm, active] = await Promise.all([
      this.parametersService.coverageRadiusKm(),
      this.prisma.branch.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    ]);
    const branches = active
      .map((branch) => {
        const distanceKm = origin
          ? haversineDistanceKm(origin.latitude, origin.longitude, Number(branch.latitude), Number(branch.longitude))
          : null;
        return { branch, distanceKm, withinRadius: distanceKm === null ? null : distanceKm <= radiusKm };
      })
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return { radiusKm, branches };
  }

  /**
   * La sucursal que eligió el cliente (HU-23). Tiene que estar activa y, en domicilio, dentro del radio de
   * cobertura de la dirección; si no, 400 y no se crea el pedido. En retiro no hay traslado (distancia 0).
   */
  async resolveChosen(
    branchId: string,
    fulfillment: Fulfillment,
    origin: { latitude: number; longitude: number } | null,
  ): Promise<CoveringBranch> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || !branch.active) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'BRANCH_UNAVAILABLE',
        message: 'La sucursal elegida no está disponible',
      });
    }
    if (fulfillment === Fulfillment.pickup) {
      return { branch, distanceKm: 0 };
    }
    if (!origin) {
      throw new BadRequestException('Indicá la dirección de entrega');
    }

    const radiusKm = await this.parametersService.coverageRadiusKm();
    const distanceKm = haversineDistanceKm(
      origin.latitude,
      origin.longitude,
      Number(branch.latitude),
      Number(branch.longitude),
    );
    if (distanceKm > radiusKm) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'OUT_OF_COVERAGE',
        message: `${branch.name} no llega a esa dirección (radio de ${radiusKm.toLocaleString('es-AR')} km)`,
        radiusKm,
      });
    }
    return { branch, distanceKm };
  }

  /** GET /api/branches/available (HU-19): lo que ve el cliente en /branches. */
  async findAvailable(query: AvailableBranchesQueryDto, user?: JwtPayload) {
    const origin = await this.resolveOrigin(query, user);
    const { radiusKm, branches } = await this.findCovering(origin.latitude, origin.longitude);
    return {
      radiusKm,
      branches: branches.map(({ branch, distanceKm }) => ({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        openingHours: branch.openingHours,
        latitude: Number(branch.latitude),
        longitude: Number(branch.longitude),
        distanceKm: Math.round(distanceKm * 100) / 100,
      })),
    };
  }

  findAll() {
    return this.prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Hasta 5 candidatos (DEV-20). `latitude`, `longitude` y `displayName` repiten el primero, así quien
   * lea un solo resultado sigue funcionando; `candidates` es la lista completa para elegir.
   */
  async geocode(address: string) {
    try {
      const candidates = await geocodeAddress(address);
      return { ...candidates[0], candidates };
    } catch (error) {
      if (error instanceof GeocodeNotFoundError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof GeocodeUnavailableError) {
        throw new BadGatewayException(error.message);
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }
    return branch;
  }

  create(dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        name: dto.name.trim(),
        address: dto.address.trim(),
        latitude: new Prisma.Decimal(dto.latitude),
        longitude: new Prisma.Decimal(dto.longitude),
        openingHours: dto.openingHours.trim(),
        phone: dto.phone.trim(),
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);
    return this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
        ...(dto.latitude !== undefined
          ? { latitude: new Prisma.Decimal(dto.latitude) }
          : {}),
        ...(dto.longitude !== undefined
          ? { longitude: new Prisma.Decimal(dto.longitude) }
          : {}),
        ...(dto.openingHours !== undefined
          ? { openingHours: dto.openingHours.trim() }
          : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.branch.delete({ where: { id } });
    return { id };
  }

  async resolveOrigin(query: AvailableBranchesQueryDto, user?: JwtPayload) {
    if (query.addressId) {
      if (!user) {
        throw new UnauthorizedException('Iniciá sesión para usar una dirección guardada');
      }
      // Una dirección de otro usuario da 404, igual que una que no existe.
      const address = await this.addressesService.findOneForUser(user.sub, query.addressId);
      return { latitude: Number(address.latitude), longitude: Number(address.longitude) };
    }
    if (query.lat === undefined || query.lng === undefined) {
      throw new BadRequestException('Indicá una dirección (addressId) o una ubicación (lat y lng)');
    }
    return { latitude: query.lat, longitude: query.lng };
  }
}
