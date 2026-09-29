import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';

// Alta y listado de administradores (HU-16).
@Controller('admin/admins')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  findAll() {
    return this.adminsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateAdminDto) {
    return this.adminsService.create(dto);
  }
}
