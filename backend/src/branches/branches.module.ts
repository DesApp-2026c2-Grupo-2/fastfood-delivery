import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module';
import { AuthModule } from '../auth/auth.module';
import { ParametersModule } from '../parameters/parameters.module';
import { AdminBranchesController } from './admin-branches.controller';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [AuthModule, AddressesModule, ParametersModule],
  controllers: [AdminBranchesController, BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
