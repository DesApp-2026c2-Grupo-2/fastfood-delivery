import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

// bcrypt solo mira los primeros 72 bytes: más largo no suma seguridad y confunde.
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function passwordMatches(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export type PublicUser = { id: string; email: string; name: string; role: Role };

// Lo único del usuario que sale por el API (nunca el hash).
export function toPublicUser(user: PublicUser): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
