import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const token = this.readBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token);
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof TokenExpiredError ? 'La sesión expiró' : 'Token inválido',
      );
    }

    // Un token bien firmado no alcanza: el usuario pudo dejar de existir (por ejemplo tras un
    // re-seed) o cambiar de rol. Sin este chequeo el carrito responde 400 por la FK en vez de 401,
    // y un claim viejo de admin sigue dando acceso. La fuente de verdad es la base.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      throw new UnauthorizedException('Token inválido');
    }

    request.user = { sub: user.id, email: user.email, role: user.role };
    return true;
  }

  // El esquema de Authorization no distingue mayúsculas (RFC 7235).
  private readBearerToken(request: Request): string | null {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
