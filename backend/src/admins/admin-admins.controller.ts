import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

type AuthedRequest = Request & { user: JwtPayload };

// Alta, edición y baja de administradores (HU-16).
@Controller('admin/admins')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  findAll() {
    return this.adminsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAdminDto) {
    return this.adminsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.adminsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.adminsService.remove(id, req.user.sub);
  }
}
