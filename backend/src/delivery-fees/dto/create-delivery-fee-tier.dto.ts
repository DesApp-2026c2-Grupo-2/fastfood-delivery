import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class CreateDeliveryFeeTierDto {
  // Tope del tramo en km, inclusive. El tramo arranca donde termina el anterior.
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  upToKm!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  price!: number;
}
