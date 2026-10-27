import { ConflictException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

// Regla del administrador del seed, separada del alta y la edición.
const INITIAL_ADMIN_EMAIL = 'admin@rapido.local';

export const initialAdminPolicy = {
  isInitial(email: string) {
    return email.toLowerCase() === INITIAL_ADMIN_EMAIL;
  },

  assertCanChangeEmail(currentEmail: string, nextEmail: string) {
    if (nextEmail !== currentEmail && this.isInitial(currentEmail)) {
      throw new ConflictException('El email del administrador inicial no se puede cambiar');
    }
  },

  // Siempre queda al menos un super_admin: el inicial no se puede bajar de rol.
  assertCanChangeRole(email: string, nextRole: AdminRole) {
    if (nextRole !== AdminRole.super_admin && this.isInitial(email)) {
      throw new ConflictException('El administrador inicial tiene que seguir siendo super admin');
    }
  },

  assertCanDelete(email: string) {
    if (this.isInitial(email)) {
      throw new ConflictException('El administrador inicial no se puede borrar');
    }
  },
};
