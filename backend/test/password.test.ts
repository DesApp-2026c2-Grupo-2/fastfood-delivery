import { Role } from '@prisma/client';
import { toPublicUser } from '../src/auth/password';

describe('usuario que sale por la API', () => {
  it('un admin sin rol explícito sale con adminRole null', () => {
    expect(toPublicUser({ id: '1', email: 'a@b.c', name: 'Ada', role: Role.admin })).toEqual({
      id: '1',
      email: 'a@b.c',
      name: 'Ada',
      role: Role.admin,
      adminRole: null,
    });
  });

  it('un cliente sin sellos sale en cero y sin premio', () => {
    expect(toPublicUser({ id: '2', email: 'c@b.c', name: 'Ana', role: Role.customer })).toEqual({
      id: '2',
      email: 'c@b.c',
      name: 'Ana',
      role: Role.customer,
      loyaltyStamps: 0,
      hasTopBuyerReward: false,
    });
  });
});
