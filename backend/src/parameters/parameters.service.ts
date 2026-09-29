import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EtaSettings } from '../orders/eta';
import { UpdateParametersDto } from './dto/update-parameters.dto';
import { PARAMETER_KEYS, PARAMETERS, ParameterValues } from './parameters';

@Injectable()
export class ParametersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return (await this.read()).map(({ key, value, updatedAt }) => {
      const { label, description, unit, min, max, integer } = PARAMETERS[key];
      return { key, label, description, unit, value, min, max, integer, updatedAt };
    });
  }

  async update(dto: UpdateParametersDto) {
    const changes = PARAMETER_KEYS.filter((key) => dto[key] !== undefined).map((key) => ({
      key,
      value: String(dto[key]),
    }));
    await this.prisma.$transaction(
      changes.map(({ key, value }) =>
        this.prisma.parameter.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    );
    return this.list();
  }

  async values(): Promise<ParameterValues> {
    const read = await this.read();
    return Object.fromEntries(read.map(({ key, value }) => [key, value])) as ParameterValues;
  }

  async coverageRadiusKm() {
    return (await this.values()).coverage_radius_km;
  }

  async etaSettings(): Promise<EtaSettings> {
    const values = await this.values();
    return {
      prepBaseMin: values.eta_prep_base_min,
      minPerItem: values.eta_min_per_item,
      kmPerMin: values.eta_km_per_min,
    };
  }

  // Sin caché: se leen en cada pedido, así un cambio del admin rige desde el próximo.
  private async read() {
    const rows = await this.prisma.parameter.findMany({ where: { key: { in: PARAMETER_KEYS } } });
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return PARAMETER_KEYS.map((key) => {
      const row = byKey.get(key);
      const stored = row ? Number(row.value) : Number.NaN;
      // Si falta la fila, o alguien la editó a mano con algo que no es un número, se usa el valor por defecto.
      return {
        key,
        value: Number.isFinite(stored) ? stored : PARAMETERS[key].defaultValue,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }
}
