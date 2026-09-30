import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateParametersDto } from './dto/update-parameters.dto';
import { ParametersService } from './parameters.service';

@Controller('admin/parameters')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminParametersController {
  constructor(private readonly parametersService: ParametersService) {}

  @Get()
  findAll() {
    return this.parametersService.list();
  }

  @Patch()
  update(@Body() dto: UpdateParametersDto) {
    return this.parametersService.update(dto);
  }
}
