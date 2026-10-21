import { PromotionType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Edición parcial. Desactivar es { active: false } (la baja es lógica).
export class UpdatePromotionDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Ingresá un nombre' })
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEnum(PromotionType, { message: 'Tipo de promoción inválido' })
  type?: PromotionType;

  @IsOptional()
  @ValidateIf((dto: UpdatePromotionDto) => dto.type !== 'two_for_one')
  @Type(() => Number)
  @IsInt({ message: 'El porcentaje tiene que ser un número entero' })
  @Min(1, { message: 'El porcentaje va de 1 a 100' })
  @Max(100, { message: 'El porcentaje va de 1 a 100' })
  value?: number;

  @IsOptional()
  @IsString({ message: 'Elegí el producto del 2x1' })
  @IsNotEmpty({ message: 'Elegí el producto del 2x1' })
  productId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  startsAt?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: 'Fecha de fin inválida' })
  endsAt?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto mínimo puede tener hasta dos decimales' })
  @Min(0.01, { message: 'El monto mínimo tiene que ser mayor a 0' })
  @Max(99999999.99, { message: 'El monto mínimo es demasiado alto' })
  minSubtotal?: number | null;
}
