import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from './customers.service';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

// Clientes desde el admin: consulta, edición y baja lógica. El alta la hace el cliente al registrarse.
@Controller('admin/customers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('withOrders') withOrders?: string,
    @Query('active') active?: string,
    @Query('page') page?: string,
  ) {
    return this.customersService.findAll({ q, withOrders, active, page });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateCustomerStatusDto) {
    return this.customersService.setActive(id, dto.active);
  }
}
