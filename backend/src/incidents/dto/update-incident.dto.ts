import { IncidentStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateIncidentDto {
  @IsEnum(IncidentStatus, { message: 'Estado inválido' })
  status!: IncidentStatus;

  // Obligatoria al resolver. Al reabrir no se manda.
  @ValidateIf((dto: UpdateIncidentDto) => dto.status === IncidentStatus.resolved)
  @IsString({ message: 'Escribí la respuesta para el cliente' })
  @IsNotEmpty({ message: 'Escribí la respuesta para el cliente' })
  @MaxLength(500, { message: 'La respuesta puede tener hasta 500 caracteres' })
  response?: string;

  // null quita el cupón si todavía no se usó. Si no viene, se deja como está.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto del cupón tiene que ser un número' })
  @Min(1, { message: 'El cupón tiene que ser de al menos $1' })
  @Max(500000, { message: 'El cupón no puede superar $500.000' })
  couponAmount?: number | null;
}
