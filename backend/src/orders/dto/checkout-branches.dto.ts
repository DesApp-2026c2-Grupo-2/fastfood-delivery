import { Fulfillment } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { GuestOrderItemDto } from './create-guest-order.dto';

/**
 * Qué sucursales puede elegir el cliente para este carrito (HU-23). Con sesión y sin `items` se usa el
 * carrito guardado; el invitado manda los ítems que está por pedir. La ubicación es una dirección guardada
 * (`addressId`, con sesión) o un punto suelto (`latitude` + `longitude`).
 */
export class CheckoutBranchesDto {
  @IsEnum(Fulfillment, { message: 'Elegí retiro o domicilio' })
  fulfillment!: Fulfillment;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'El carrito está vacío' })
  @ValidateNested({ each: true })
  @Type(() => GuestOrderItemDto)
  items?: GuestOrderItemDto[];
}
