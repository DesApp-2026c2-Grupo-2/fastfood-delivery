import * as bcrypt from 'bcrypt';
import { AdminRole, Role } from '@prisma/client';

// bcrypt solo mira los primeros 72 bytes: más largo no suma seguridad y confunde.
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function passwordMatches(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  adminRole?: AdminRole | null;
  loyaltyStamps?: number;
  hasTopBuyerReward?: boolean;
};

// Lo único del usuario que sale por el API (nunca el hash). adminRole solo va en los admins: el front
// lo usa para saber qué secciones del backoffice mostrar. Sellos y premio Top 3 solo en clientes.
export function toPublicUser(user: PublicUser): PublicUser {
  const base = { id: user.id, email: user.email, name: user.name, role: user.role };
  if (user.role === Role.admin) {
    return { ...base, adminRole: user.adminRole ?? null };
  }
  return {
    ...base,
    loyaltyStamps: user.loyaltyStamps ?? 0,
    hasTopBuyerReward: user.hasTopBuyerReward ?? false,
  };
}
