import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CityField, PostalCodeField, ProvinceField } from './address-fields';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAddressDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  alias?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  street!: string;

  @CityField()
  city?: string | null;

  @ProvinceField()
  province?: string | null;

  @PostalCodeField()
  postalCode?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
