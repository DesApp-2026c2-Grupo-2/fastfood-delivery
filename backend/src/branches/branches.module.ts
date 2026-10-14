import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module';
import { AuthModule } from '../auth/auth.module';
import { ParametersModule } from '../parameters/parameters.module';
import { AdminBranchesController } from './admin-branches.controller';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { GeocodeController } from './geocode.controller';

@Module({
  imports: [AuthModule, AddressesModule, ParametersModule],
  controllers: [AdminBranchesController, BranchesController, GeocodeController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
