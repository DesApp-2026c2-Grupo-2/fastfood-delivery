import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { PARAMETERS } from '../../parameters/parameters';

export class UpdateTop3CampaignDto {
  @Type(() => Number)
  @IsInt()
  @Min(PARAMETERS.top3_discount_percent.min)
  @Max(PARAMETERS.top3_discount_percent.max)
  discountPercent!: number;
}
