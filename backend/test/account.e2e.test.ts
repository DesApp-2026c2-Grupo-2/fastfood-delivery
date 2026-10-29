import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { OrderStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DELETED_USER_NAME, deletedUserEmail } from '../src/account/account.service';
import { passwordMatches } from '../src/auth/password';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

// Todos los usuarios de este archivo empiezan así; al final se borran por ese prefijo.
const EMAIL_PREFIX = 'account.e2e.';
const PASSWORD = 'Cliente123!';

const originalDemoFlag = process.env.PASSWORD_RESET_DEMO;

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;
let adminToken: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function uniqueEmail(alias: string) {
  return `${EMAIL_PREFIX}${alias}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@rapido.local`;
}

async function registerCustomer(alias = 'cliente') {
  const email = uniqueEmail(alias);
  const response = await request(server)
    .post('/api/auth/register')
    .send({ email, name: `Cliente ${alias}`, password: PASSWORD });
  expect(response.status).toBe(201);
  return { email, id: response.body.user.id as string, token: response.body.accessToken as string };
}

function login(email: string, password: string) {
  return request(server).post('/api/auth/login').send({ email, password });
}

function forgot(email: string) {
  return request(server).post('/api/auth/forgot-password').send({ email });
}

function reset(token: string, newPassword: string) {
  return request(server).post('/api/auth/reset-password').send({ token, newPassword });
}

beforeAll(async () => {
  app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  server = app.getHttpServer();
  prisma = app.get(PrismaService);

  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  expect(admin.status).toBe(201);
  adminToken = admin.body.accessToken;
}, 30_000);

beforeEach(() => {
  // El modo demo (token en la respuesta) está activo fuera de producción; algún test lo apaga.
  delete process.env.PASSWORD_RESET_DEMO;
});

afterAll(async () => {
  if (originalDemoFlag === undefined) {
    delete process.env.PASSWORD_RESET_DEMO;
  } else {
    process.env.PASSWORD_RESET_DEMO = originalDemoFlag;
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
  await app.close();
});

describe('Perfil: GET y PATCH /api/me (HU-14)', () => {
  const patchMe = (token: string, body: object) => request(server).patch('/api/me').set(auth(token)).send(body);

  it('devuelve los datos de la sesión, sin el hash de la contraseña', async () => {
    const { email, id, token } = await registerCustomer();

    const response = await request(server).get('/api/me').set(auth(token));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id,
      email,
      name: 'Cliente cliente',
      role: 'customer',
      loyaltyStamps: 0,
      hasTopBuyerReward: false,
      loyalty: {
        stamps: 0,
        progress: 0,
        ordersRequired: 10,
        minOrderAmount: 15000,
        qualifiesThisOrder: false,
        rewardOnThisOrder: false,
      },
    });
    expect((await request(server).get('/api/me')).status).toBe(401);
  });

  it('cambia el nombre y /api/auth/me ya lo devuelve (el "Hola {nombre}" del header)', async () => {
    const { email, id, token } = await registerCustomer();

    const response = await patchMe(token, { name: '  Ana María  ' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id,
      email,
      name: 'Ana María',
      role: 'customer',
      loyaltyStamps: 0,
      hasTopBuyerReward: false,
    });
    const me = await request(server).get('/api/auth/me').set(auth(token));
    expect(me.body.name).toBe('Ana María');
  });

  it('el email es de solo lectura', async () => {
    const { email, token } = await registerCustomer();

    const response = await patchMe(token, { email: uniqueEmail('otro') });

    expect(response.status).toBe(400);
    expect((await request(server).get('/api/me').set(auth(token))).body.email).toBe(email);
  });

  it('valida el nombre', async () => {
    const { token } = await registerCustomer();

    expect((await patchMe(token, { name: '   ' })).status).toBe(400);
    expect((await patchMe(token, { name: 'x'.repeat(81) })).status).toBe(400);
  });

  it('cambia la contraseña con la actual y la nueva', async () => {
    const { email, token } = await registerCustomer();

    const response = await patchMe(token, { currentPassword: PASSWORD, newPassword: 'Nueva123!' });

    expect(response.status).toBe(200);
    expect((await login(email, PASSWORD)).status).toBe(401);
    expect((await login(email, 'Nueva123!')).status).toBe(201);
  });

  it('con la contraseña actual incorrecta responde 400 (no 401, que cerraría la sesión en el front)', async () => {
    const { email, token } = await registerCustomer();

    const response = await patchMe(token, { currentPassword: 'incorrecta', newPassword: 'Nueva123!' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('La contraseña actual no es correcta');
    expect((await login(email, PASSWORD)).status).toBe(201);
  });

  it('para cambiar la contraseña pide la actual y una nueva válida y distinta', async () => {
    const { email, token } = await registerCustomer();

    expect((await patchMe(token, { newPassword: 'Nueva123!' })).status).toBe(400);
    expect((await patchMe(token, { currentPassword: PASSWORD })).status).toBe(400);
    expect((await patchMe(token, { currentPassword: PASSWORD, newPassword: '123' })).status).toBe(400);
    expect((await patchMe(token, { currentPassword: PASSWORD, newPassword: PASSWORD })).status).toBe(400);
    expect((await login(email, PASSWORD)).status).toBe(201);
  });

  it('cada uno edita solo su cuenta', async () => {
    const ana = await registerCustomer('ana');
    const beto = await registerCustomer('beto');

    await patchMe(ana.token, { name: 'Ana Editada' });

    const betoMe = await request(server).get('/api/me').set(auth(beto.token));
    expect(betoMe.body).toMatchObject({ id: beto.id, name: 'Cliente beto' });
  });

  it('un admin también tiene su perfil', async () => {
    const response = await request(server).get('/api/me').set(auth(adminToken));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ email: ADMIN_EMAIL, role: 'admin' });
  });
});

describe('DELETE /api/me (baja y anonimización)', () => {
  const stamp = Date.now();

  async function createBranch() {
    return prisma.branch.create({
      data: {
        name: `Sucursal cuenta E2E ${stamp} ${Math.random().toString(36).slice(2, 6)}`,
        address: 'Calle E2E 123',
        latitude: -34.6,
        longitude: -58.4,
        openingHours: '10-22',
        phone: '1111-1111',
      },
    });
  }

  async function createOrder(userId: string, branchId: string, status: OrderStatus, addressId?: string) {
    return prisma.order.create({
      data: {
        userId,
        branchId,
        addressId,
        fulfillment: addressId ? 'delivery' : 'pickup',
        status,
        subtotal: 2500,
        totalAmount: 2500,
        estimatedDeliveryAt: new Date(),
      },
    });
  }

  it('con la contraseña mal no toca la cuenta', async () => {
    const { email, token } = await registerCustomer('baja-clave');

    const response = await request(server).delete('/api/me').set(auth(token)).send({ password: 'incorrecta' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('La contraseña no es correcta');
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).active).toBe(true);
    expect((await request(server).get('/api/me').set(auth(token))).status).toBe(200);
  });

  it('con un pedido en curso responde 409 y no anonimiza', async () => {
    const customer = await registerCustomer('baja-curso');
    const branch = await createBranch();
    const order = await createOrder(customer.id, branch.id, OrderStatus.preparing);

    try {
      const response = await request(server).delete('/api/me').set(auth(customer.token)).send({ password: PASSWORD });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Tenés un pedido en curso');
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: customer.id } });
      expect(stored.email).toBe(customer.email);
      expect(stored.name).toBe('Cliente baja-curso');
      expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('preparing');
    } finally {
      await prisma.order.deleteMany({ where: { id: order.id } });
      await prisma.branch.delete({ where: { id: branch.id } });
    }
  });

  it('anonimiza solo al usuario y conserva el pedido', async () => {
    const customer = await registerCustomer('baja-ok');
    const branch = await createBranch();
    const delivery = await prisma.address.create({
      data: {
        userId: customer.id,
        alias: 'Casa',
        street: 'Av. Siempre Viva 742',
        latitude: -34.61,
        longitude: -58.41,
        isDefault: true,
      },
    });
    const unused = await prisma.address.create({
      data: {
        userId: customer.id,
        alias: 'Trabajo',
        street: 'Oficina 8',
        latitude: -34.62,
        longitude: -58.42,
      },
    });
    const order = await createOrder(customer.id, branch.id, OrderStatus.delivered, delivery.id);
    await prisma.cart.create({ data: { userId: customer.id } });
    await prisma.user.update({
      where: { id: customer.id },
      data: { loyaltyStamps: 4, hasTopBuyerReward: true },
    });
    await forgot(customer.email);

    try {
      const response = await request(server).delete('/api/me').set(auth(customer.token)).send({ password: PASSWORD });

      expect(response.status).toBe(204);
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: customer.id } });
      expect(stored.name).toBe(DELETED_USER_NAME);
      expect(stored.email).toBe(deletedUserEmail(customer.id));
      expect(stored.email).not.toBe(customer.email);
      expect(stored.active).toBe(false);
      expect(stored.loyaltyStamps).toBe(0);
      expect(stored.hasTopBuyerReward).toBe(false);
      expect(await passwordMatches(PASSWORD, stored.passwordHash)).toBe(false);

      const keptOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(keptOrder.userId).toBe(customer.id);
      expect(Number(keptOrder.totalAmount)).toBe(2500);
      expect(keptOrder.addressId).toBe(delivery.id);
      const keptAddress = await prisma.address.findUniqueOrThrow({ where: { id: delivery.id } });
      expect(keptAddress.street).toBe('Av. Siempre Viva 742');
      expect(keptAddress.userId).toBeNull();
      expect(keptAddress.alias).toBe('');
      expect(await prisma.address.findUnique({ where: { id: unused.id } })).toBeNull();
      expect(await prisma.cart.count({ where: { userId: customer.id } })).toBe(0);
      expect(await prisma.passwordResetToken.count({ where: { userId: customer.id } })).toBe(0);

      expect((await request(server).get('/api/me').set(auth(customer.token))).status).toBe(401);
      expect((await login(customer.email, PASSWORD)).status).toBe(401);
      const sameEmail = await request(server)
        .post('/api/auth/register')
        .send({ email: customer.email, name: 'Otra persona', password: PASSWORD });
      expect(sameEmail.status).toBe(201);
    } finally {
      await prisma.order.deleteMany({ where: { userId: customer.id } });
      await prisma.address.deleteMany({ where: { id: { in: [delivery.id, unused.id] } } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: customer.id } });
      await prisma.cart.deleteMany({ where: { userId: customer.id } });
      await prisma.user.deleteMany({ where: { id: customer.id } });
      await prisma.user.deleteMany({ where: { email: customer.email } });
      await prisma.branch.delete({ where: { id: branch.id } });
    }
  });

  it('un admin no puede eliminar su cuenta por esta vía', async () => {
    const response = await request(server).delete('/api/me').set(auth(adminToken)).send({ password: ADMIN_PASSWORD });

    expect(response.status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } })).name).not.toBe(DELETED_USER_NAME);
  });
});

describe('Recuperar contraseña (HU-15)', () => {
  it('happy path: pido el token, cambio la clave y entro con la nueva', async () => {
    const { email, id } = await registerCustomer();

    const requested = await forgot(email);

    expect(requested.status).toBe(200);
    expect(requested.body).toEqual({
      message: expect.any(String),
      demo: { resetToken: expect.any(String), expiresAt: expect.any(String) },
    });
    const minutesLeft = (new Date(requested.body.demo.expiresAt).getTime() - Date.now()) / 60_000;
    expect(minutesLeft).toBeGreaterThan(29);
    expect(minutesLeft).toBeLessThanOrEqual(30);

    const changed = await reset(requested.body.demo.resetToken, 'Reset123!');

    expect(changed.status).toBe(200);
    expect(changed.body.message).toEqual(expect.any(String));
    expect((await login(email, 'Reset123!')).status).toBe(201);
    expect((await login(email, PASSWORD)).status).toBe(401);
    // En la base queda el hash del token, nunca el token.
    const stored = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: id } });
    expect(stored.tokenHash).not.toBe(requested.body.demo.resetToken);
    expect(stored.usedAt).not.toBeNull();
  });

  it('el token es de un solo uso', async () => {
    const { email } = await registerCustomer();
    const { body } = await forgot(email);
    expect((await reset(body.demo.resetToken, 'Reset123!')).status).toBe(200);

    const again = await reset(body.demo.resetToken, 'Otra123!');

    expect(again.status).toBe(400);
    expect((await login(email, 'Reset123!')).status).toBe(201);
  });

  it('el token vence', async () => {
    const { email, id } = await registerCustomer();
    const { body } = await forgot(email);
    await prisma.passwordResetToken.updateMany({
      where: { userId: id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const response = await reset(body.demo.resetToken, 'Reset123!');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('El código para cambiar la contraseña no es válido o ya venció. Pedí uno nuevo.');
    expect((await login(email, PASSWORD)).status).toBe(201);
  });

  it('pedir otro token invalida el anterior', async () => {
    const { email } = await registerCustomer();
    const first = await forgot(email);
    const second = await forgot(email);

    expect((await reset(first.body.demo.resetToken, 'Reset123!')).status).toBe(400);
    expect((await reset(second.body.demo.resetToken, 'Reset123!')).status).toBe(200);
  });

  it('con un email no registrado responde lo mismo, sin token', async () => {
    const { email } = await registerCustomer();
    const registered = await forgot(email);

    const unknown = await forgot(uniqueEmail('nadie'));

    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({ message: registered.body.message });
  });

  it('encuentra la cuenta aunque el email venga con mayúsculas o espacios', async () => {
    const { email } = await registerCustomer();

    const response = await forgot(`  ${email.toUpperCase()} `);

    expect(response.status).toBe(200);
    expect(response.body.demo.resetToken).toEqual(expect.any(String));
  });

  it('no genera tokens para administradores', async () => {
    const response = await forgot(ADMIN_EMAIL);

    expect(response.status).toBe(200);
    expect(response.body.demo).toBeUndefined();
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
    expect(await prisma.passwordResetToken.count({ where: { userId: admin.id } })).toBe(0);
  });

  it('con PASSWORD_RESET_DEMO=false el token no viaja en la respuesta', async () => {
    const { email, id } = await registerCustomer();
    process.env.PASSWORD_RESET_DEMO = 'false';

    const response = await forgot(email);

    expect(response.status).toBe(200);
    expect(response.body.demo).toBeUndefined();
    expect(await prisma.passwordResetToken.count({ where: { userId: id } })).toBe(1);
  });

  it('valida los datos', async () => {
    expect((await forgot('no-es-un-email')).status).toBe(400);
    expect((await reset('', 'Reset123!')).status).toBe(400);
    expect((await reset('cualquiera', '123')).status).toBe(400);
    expect((await reset('token-inventado', 'Reset123!')).status).toBe(400);
  });
});

describe('Administradores (HU-16)', () => {
  const createAdmin = (body: object, token = adminToken) =>
    request(server).post('/api/admin/admins').set(auth(token)).send(body);

  it('lista los admins, incluido el del seed, sin datos sensibles ni clientes', async () => {
    const customer = await registerCustomer();

    const response = await request(server).get('/api/admin/admins').set(auth(adminToken));

    expect(response.status).toBe(200);
    expect(response.body).toContainEqual({
      id: expect.any(String),
      name: expect.any(String),
      email: ADMIN_EMAIL,
      adminRole: 'super_admin',
      createdAt: expect.any(String),
      deletable: ADMIN_EMAIL.toLowerCase() !== 'admin@rapido.local',
    });
    const emails = response.body.map((admin: { email: string }) => admin.email);
    expect(emails).not.toContain(customer.email);
    expect(response.body.every((admin: object) => !('passwordHash' in admin))).toBe(true);
  });

  it('da de alta un admin que puede entrar al backoffice', async () => {
    const email = uniqueEmail('admin');

    const created = await createAdmin({ name: '  Carla Admin ', email: email.toUpperCase(), password: 'Admin456!' });

    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      name: 'Carla Admin',
      email,
      adminRole: 'super_admin',
      createdAt: expect.any(String),
      deletable: true,
    });

    const session = await login(email, 'Admin456!');
    expect(session.status).toBe(201);
    expect(session.body.user.role).toBe('admin');
    const list = await request(server).get('/api/admin/admins').set(auth(session.body.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.map((admin: { id: string }) => admin.id)).toContain(created.body.id);
  });

  it('un email ya registrado responde 409', async () => {
    const customer = await registerCustomer();

    expect((await createAdmin({ name: 'Otro', email: customer.email, password: 'Admin456!' })).status).toBe(409);
    expect((await createAdmin({ name: 'Otro', email: ADMIN_EMAIL, password: 'Admin456!' })).status).toBe(409);
    const stillCustomer = await prisma.user.findUniqueOrThrow({ where: { email: customer.email } });
    expect(stillCustomer.role).toBe('customer');
  });

  it('valida nombre, email y contraseña', async () => {
    const email = uniqueEmail('invalido');
    const invalid = [
      { email, password: 'Admin456!' },
      { name: 'Sin email', password: 'Admin456!' },
      { name: 'Email roto', email: 'no-es-un-email', password: 'Admin456!' },
      { name: 'Clave corta', email, password: '123' },
      { name: 'Con rol', email, password: 'Admin456!', role: 'customer' },
    ];
    for (const body of invalid) {
      expect((await createAdmin(body)).status).toBe(400);
    }
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });

  it('un cliente no lista ni crea admins', async () => {
    const customer = await registerCustomer();
    const email = uniqueEmail('intruso');

    expect((await request(server).get('/api/admin/admins').set(auth(customer.token))).status).toBe(403);
    expect((await createAdmin({ name: 'Intruso', email, password: 'Admin456!' }, customer.token)).status).toBe(403);
    expect((await request(server).get('/api/admin/admins')).status).toBe(401);
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });

  it('edita nombre, email y contraseña de un admin', async () => {
    const email = uniqueEmail('editar');
    const created = await createAdmin({ name: 'Para editar', email, password: 'Admin456!' });
    expect(created.status).toBe(201);
    const nextEmail = uniqueEmail('editado');

    const updated = await request(server)
      .patch(`/api/admin/admins/${created.body.id}`)
      .set(auth(adminToken))
      .send({ name: 'Editado', email: nextEmail.toUpperCase(), password: 'Nueva789!' });

    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({
      id: created.body.id,
      name: 'Editado',
      email: nextEmail,
      adminRole: 'super_admin',
      createdAt: expect.any(String),
      deletable: true,
    });
    expect(updated.body.passwordHash).toBeUndefined();
    expect((await login(email, 'Admin456!')).status).toBe(401);
    expect((await login(nextEmail, 'Nueva789!')).status).toBe(201);
  });

  it('borra un admin y rechaza borrar o cambiar el email del inicial', async () => {
    const email = uniqueEmail('borrar');
    const created = await createAdmin({ name: 'Para borrar', email, password: 'Admin456!' });
    const seed = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@rapido.local' } });

    const blockedEmail = await request(server)
      .patch(`/api/admin/admins/${seed.id}`)
      .set(auth(adminToken))
      .send({ email: uniqueEmail('seed') });
    expect(blockedEmail.status).toBe(409);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: seed.id } })).email).toBe('admin@rapido.local');

    const blockedDelete = await request(server).delete(`/api/admin/admins/${seed.id}`).set(auth(adminToken));
    expect(blockedDelete.status).toBe(409);
    expect(await prisma.user.findUnique({ where: { id: seed.id } })).not.toBeNull();

    const removed = await request(server).delete(`/api/admin/admins/${created.body.id}`).set(auth(adminToken));
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ id: created.body.id });
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    expect((await login(email, 'Admin456!')).status).toBe(401);
  });

  it('un admin no puede borrarse a sí mismo', async () => {
    const email = uniqueEmail('propio');
    const created = await createAdmin({ name: 'Yo mismo', email, password: 'Admin456!' });
    const session = await login(email, 'Admin456!');
    expect(session.status).toBe(201);

    const self = await request(server)
      .delete(`/api/admin/admins/${created.body.id}`)
      .set(auth(session.body.accessToken));
    expect(self.status).toBe(409);
    expect(await prisma.user.findUnique({ where: { email } })).not.toBeNull();

    const removed = await request(server).delete(`/api/admin/admins/${created.body.id}`).set(auth(adminToken));
    expect(removed.status).toBe(200);
  });

  it('un cliente no edita ni borra admins', async () => {
    const customer = await registerCustomer();
    const email = uniqueEmail('protegido');
    const created = await createAdmin({ name: 'Protegido', email, password: 'Admin456!' });

    expect(
      (await request(server).patch(`/api/admin/admins/${created.body.id}`).set(auth(customer.token)).send({ name: 'Hack' }))
        .status,
    ).toBe(403);
    expect((await request(server).delete(`/api/admin/admins/${created.body.id}`).set(auth(customer.token))).status).toBe(
      403,
    );
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).name).toBe('Protegido');
  });
});
