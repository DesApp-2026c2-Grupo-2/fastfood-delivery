import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (request.user?.role !== Role.admin) {
      throw new ForbiddenException('Se requiere rol administrador');
    }
    return true;
  }
}
