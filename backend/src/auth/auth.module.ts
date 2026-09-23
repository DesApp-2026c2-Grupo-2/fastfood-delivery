import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard } from './admin.guard';
import { CustomerGuard } from './customer.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

const DEFAULT_EXPIRES_IN = '7d';

// "7d", "12h"... pasan tal cual. Un número pelado se toma como segundos: jsonwebtoken lo leería en milisegundos.
function resolveExpiresIn(raw: string | undefined): JwtSignOptions['expiresIn'] {
  const value = raw?.trim() || DEFAULT_EXPIRES_IN;
  return /^\d+$/.test(value) ? Number(value) : (value as JwtSignOptions['expiresIn']);
}

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-only-change-me'),
        signOptions: { expiresIn: resolveExpiresIn(config.get<string>('JWT_EXPIRES_IN')) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminGuard, CustomerGuard],
  exports: [JwtModule, JwtAuthGuard, AdminGuard, CustomerGuard],
})
export class AuthModule {}
