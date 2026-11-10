import { IncidentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateIncidentDto {
  @IsEnum(IncidentStatus, { message: 'Estado inválido' })
  status!: IncidentStatus;
}