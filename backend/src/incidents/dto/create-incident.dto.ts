import { IncidentReason } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIncidentDto {
  @IsEnum(IncidentReason, { message: 'Motivo inválido' })
  reason!: IncidentReason;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  message?: string;
}