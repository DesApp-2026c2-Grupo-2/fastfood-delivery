import { Type } from 'class-transformer';
import { IsArray, IsISO8601, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SyncCartBlockItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extraIds?: string[];

  @IsOptional()
  @IsISO8601()
  addedAt?: string;
}

export class SyncCartBlockDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncCartBlockItemDto)
  items!: SyncCartBlockItemDto[];
}
