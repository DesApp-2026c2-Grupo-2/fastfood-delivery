import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AdminRole, Role } from '@prisma/client';
import { JwtPayload } from './jwt-payload';

const ORDERS_VIEWER_ALLOWED = 'ordersViewerAllowed';

/**
 * Abre una ruta de admin también al rol orders_viewer. Sin esto, solo entra super_admin: así una ruta de
 * admin nueva queda cerrada para el rol de solo lectura hasta que alguien la abra a propósito.
 */
export const AllowOrdersViewer = () => SetMetadata(ORDERS_VIEWER_ALLOWED, true);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    if (user?.role !== Role.admin) {
      throw new ForbiddenException('Se requiere rol administrador');
    }
    if (user.adminRole === AdminRole.super_admin) {
      return true;
    }

    const viewerAllowed = this.reflector.getAllAndOverride<boolean>(ORDERS_VIEWER_ALLOWED, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (user.adminRole === AdminRole.orders_viewer && viewerAllowed) {
      return true;
    }
    throw new ForbiddenException('Tu rol solo permite consultar pedidos');
  }
}
