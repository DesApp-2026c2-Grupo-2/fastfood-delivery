import { Type } from 'class-transformer';
import { IsInt, IsNumber, Max, Min } from 'class-validator';
import { PARAMETERS } from '../../parameters/parameters';

export class UpdateLoyaltyCampaignDto {
  @Type(() => Number)
  @IsInt()
  @Min(PARAMETERS.loyalty_orders_required.min)
  @Max(PARAMETERS.loyalty_orders_required.max)
  ordersRequired!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(PARAMETERS.loyalty_min_order_amount.min)
  @Max(PARAMETERS.loyalty_min_order_amount.max)
  minOrderAmount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(PARAMETERS.loyalty_discount_percent.min)
  @Max(PARAMETERS.loyalty_discount_percent.max)
  discountPercent!: number;
}
