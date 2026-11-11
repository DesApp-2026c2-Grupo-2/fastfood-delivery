import { Fulfillment } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateOrderDto {
  @IsEnum(Fulfillment, { message: 'Elegí retiro o domicilio' })
  fulfillment!: Fulfillment;

  // El cliente elige la sucursal (HU-23); el servidor ya no asigna la más cercana.
  @IsString()
  @IsNotEmpty({ message: 'Elegí una sucursal' })
  branchId!: string;

  // Solo en domicilio. En retiro se ignora y el pedido queda sin dirección.
  @ValidateIf((order: CreateOrderDto) => order.fulfillment === Fulfillment.delivery)
  @IsString()
  @IsNotEmpty({ message: 'Elegí una dirección de entrega' })
  addressId?: string;

  // true solo cuando el cliente aceptó dejar el pedido para la próxima apertura.
  @IsOptional()
  @IsBoolean()
  scheduleWhenClosed?: boolean;

  // Cupón de reclamo elegido. Si no llega, se usa el que vence antes.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  couponIncidentId?: string;
}
