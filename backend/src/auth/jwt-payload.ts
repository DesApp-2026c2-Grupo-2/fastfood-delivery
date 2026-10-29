import { AdminRole, Role } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  // No viaja en el token: JwtAuthGuard lo lee de la base en cada pedido, así un cambio de rol rige enseguida.
  adminRole?: AdminRole | null;
};
