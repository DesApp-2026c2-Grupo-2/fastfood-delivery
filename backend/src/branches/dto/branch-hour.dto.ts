import { Type } from 'class-transformer';
import { IsInt, Matches, Max, Min } from 'class-validator';

export class BranchHourDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La apertura tiene que ser HH:mm' })
  opensAt!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'El cierre tiene que ser HH:mm' })
  closesAt!: string;
}
