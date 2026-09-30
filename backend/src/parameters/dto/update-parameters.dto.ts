import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { PARAMETERS } from '../parameters';

// Cada propiedad es una clave de Parameter; se mandan solo las que cambian.
export class UpdateParametersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(PARAMETERS.coverage_radius_km.min)
  @Max(PARAMETERS.coverage_radius_km.max)
  coverage_radius_km?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(PARAMETERS.eta_prep_base_min.min)
  @Max(PARAMETERS.eta_prep_base_min.max)
  eta_prep_base_min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(PARAMETERS.eta_min_per_item.min)
  @Max(PARAMETERS.eta_min_per_item.max)
  eta_min_per_item?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(PARAMETERS.eta_km_per_min.min)
  @Max(PARAMETERS.eta_km_per_min.max)
  eta_km_per_min?: number;
}
