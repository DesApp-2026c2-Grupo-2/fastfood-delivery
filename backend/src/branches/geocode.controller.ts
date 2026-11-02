import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { GeocodeAddressDto, geocodeQuery } from './dto/geocode-address.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';

// Misma búsqueda que el admin, abierta al cliente y al invitado: el mapa de la dirección (DEV-23)
// mueve el pin con estos candidatos. Nominatim se consulta de a una por segundo, con cualquier origen.
@Controller('geocode')
export class GeocodeController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  geocode(@Body() dto: GeocodeAddressDto) {
    return this.branchesService.geocode(geocodeQuery(dto));
  }

  // "Usar mi ubicación": de las coordenadas del dispositivo a calle, ciudad, provincia y CP.
  @Post('reverse')
  @HttpCode(HttpStatus.OK)
  reverse(@Body() dto: ReverseGeocodeDto) {
    return this.branchesService.reverseGeocode(dto.latitude, dto.longitude);
  }
}
