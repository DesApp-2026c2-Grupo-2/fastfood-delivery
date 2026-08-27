import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  imageUrl!: string;

  @Type(() => Boolean)
  @IsBoolean()
  available!: boolean;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;
}
