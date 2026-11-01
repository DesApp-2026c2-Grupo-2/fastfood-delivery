import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { GeocodeQuery } from '../geocode';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * `address` es la búsqueda libre de siempre (el admin la sigue usando). El formulario de la dirección
 * del cliente manda los campos separados (`street`, `city`, `province`, `postalCode`).
 */
export class GeocodeAddressDto {
  @ValidateIf((dto: GeocodeAddressDto) => dto.street === undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address?: string;

  @ValidateIf((dto: GeocodeAddressDto) => dto.address === undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  street?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  province?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;
}

export function geocodeQuery(dto: GeocodeAddressDto): GeocodeQuery {
  if (dto.street !== undefined) {
    return { street: dto.street, city: dto.city, province: dto.province, postalCode: dto.postalCode };
  }
  return dto.address ?? '';
}
