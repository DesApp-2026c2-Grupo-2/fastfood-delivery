import { ConflictException } from '@nestjs/common';

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

  assertCanDelete(email: string) {
    if (this.isInitial(email)) {
      throw new ConflictException('El administrador inicial no se puede borrar');
    }
  },
};
