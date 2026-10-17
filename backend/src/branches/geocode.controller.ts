import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { GeocodeAddressDto } from './dto/geocode-address.dto';

// Misma búsqueda que el admin, abierta al cliente y al invitado: el mapa de la dirección (DEV-23)
// mueve el pin con estos candidatos. Nominatim se consulta de a una por segundo, con cualquier origen.
@Controller('geocode')
export class GeocodeController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  geocode(@Body() dto: GeocodeAddressDto) {
    return this.branchesService.geocode(dto.address);
  }
}
