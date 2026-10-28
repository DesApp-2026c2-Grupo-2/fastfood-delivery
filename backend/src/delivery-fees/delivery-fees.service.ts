import { Injectable } from '@nestjs/common';
import { Fulfillment } from '@prisma/client';
import { ParametersService } from '../parameters/parameters.service';

/**
 * Envío de un pedido a domicilio: precio por km × km, cobrando cada cuadra (100 m) iniciada. La distancia se
 * redondea antes a 2 decimales, igual que la que ve el cliente en el checkout, así 1,10 km son 11 cuadras y no 12.
 */
export function feeForDistance(pricePerKm: number, distanceKm: number): number {
  const hundredths = Math.round(distanceKm * 100);
  const km = Math.ceil(hundredths / 10) / 10;
  return Math.round(km * pricePerKm * 100) / 100;
}

@Injectable()
export class DeliveryFeesService {
  constructor(private readonly parametersService: ParametersService) {}

  /** Sin caché: se lee en cada pedido, así un cambio del admin rige desde el próximo. */
  pricePerKm() {
    return this.parametersService.deliveryPricePerKm();
  }

  /** Lo que se cobra de envío. Retiro no paga. */
  async feeFor(fulfillment: Fulfillment, distanceKm: number) {
    if (fulfillment === Fulfillment.pickup) return 0;
    return feeForDistance(await this.pricePerKm(), distanceKm);
  }
}
