import { Fulfillment } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ExtraIds } from '../../extras/extra-ids.decorator';

export class GuestOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @ExtraIds()
  extraIds?: string[];
}

export class CreateGuestOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(Fulfillment, { message: 'Elegí retiro o domicilio' })
  fulfillment!: Fulfillment;

  // El cliente elige la sucursal (HU-23); el servidor ya no asigna la más cercana.
  @IsString()
  @IsNotEmpty({ message: 'Elegí una sucursal' })
  branchId!: string;

  // La dirección solo hace falta en domicilio; en retiro se ignora y el pedido queda sin dirección.
  @ValidateIf((order: CreateGuestOrderDto) => order.fulfillment === Fulfillment.delivery)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  street?: string;

  @ValidateIf((order: CreateGuestOrderDto) => order.fulfillment === Fulfillment.delivery)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ValidateIf((order: CreateGuestOrderDto) => order.fulfillment === Fulfillment.delivery)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'El carrito está vacío' })
  @ValidateNested({ each: true })
  @Type(() => GuestOrderItemDto)
  items!: GuestOrderItemDto[];
}
