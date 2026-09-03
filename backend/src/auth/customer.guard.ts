import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class CustomerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (request.user?.role !== Role.customer) {
      throw new ForbiddenException('Se requiere rol cliente');
    }
    return true;
  }
}
