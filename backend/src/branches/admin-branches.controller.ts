import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { GeocodeAddressDto } from './dto/geocode-address.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('admin/branches')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Post('geocode')
  @HttpCode(HttpStatus.OK)
  geocode(@Body() dto: GeocodeAddressDto) {
    return this.branchesService.geocode(dto.address);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}
