import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { GuestOrderItemDto } from './create-guest-order.dto';

/**
 * Cotización antes de confirmar (HU-21). Con sesión y sin `items` cotiza el carrito guardado; el invitado
 * manda los ítems que está por pedir (mismo formato que POST /api/orders/guest).
 */
export class QuotePromotionDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'El carrito está vacío' })
  @ValidateNested({ each: true })
  @Type(() => GuestOrderItemDto)
  items?: GuestOrderItemDto[];
}
