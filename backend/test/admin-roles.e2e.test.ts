import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

// Todos los usuarios de este archivo empiezan así; al final se borran por ese prefijo.
const EMAIL_PREFIX = 'admin-roles.e2e.';
const PASSWORD = 'Admin123!';
const stamp = Date.now();

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;
let superToken: string;
let branchId: string;
let orderId: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function uniqueEmail(alias: string) {
  return `${EMAIL_PREFIX}${alias}.${stamp}.${Math.random().toString(36).slice(2, 8)}@rapido.local`;
}

async function login(email: string, password = PASSWORD) {
  const response = await request(server).post('/api/auth/login').send({ email, password });
  expect(response.status).toBe(201);
  return response.body as { accessToken: string; user: Record<string, unknown> };
}

// Alta de un admin por el super admin del seed; devuelve el admin creado y su token.
async function createAdmin(alias: string, adminRole?: string) {
  const email = uniqueEmail(alias);
  const created = await request(server)
    .post('/api/admin/admins')
    .set(auth(superToken))
    .send({ name: `Admin ${alias}`, email, password: PASSWORD, ...(adminRole ? { adminRole } : {}) });
  expect(created.status).toBe(201);
  const session = await login(email);
  return { id: created.body.id as string, email, body: created.body, token: session.accessToken };
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

  superToken = (await login(ADMIN_EMAIL, ADMIN_PASSWORD)).accessToken;

  const branch = await prisma.branch.create({
    data: {
      name: `Sucursal Roles E2E ${stamp}`,
      address: 'Calle E2E 123',
      latitude: -34.6,
      longitude: -58.4,
      openingHours: '10-22',
      phone: '1111-1111',
    },
  });
  branchId = branch.id;
  const order = await prisma.order.create({
    data: {
      branchId,
      fulfillment: 'pickup',
      guestName: 'Invitado Roles',
      guestEmail: `${EMAIL_PREFIX}guest.${stamp}@rapido.local`,
      subtotal: 1000,
      totalAmount: 1000,
      estimatedDeliveryAt: new Date(),
    },
  });
  orderId = order.id;
});

afterAll(async () => {
  if (branchId) {
    await prisma.order.deleteMany({ where: { branchId } });
    await prisma.branch.delete({ where: { id: branchId } });
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
  await app.close();
});

describe('Rol del admin en la sesión', () => {
  it('login y /auth/me del admin inicial dicen super_admin; los clientes no traen adminRole', async () => {
    const session = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(session.user).toMatchObject({ role: 'admin', adminRole: 'super_admin' });

    const me = await request(server).get('/api/auth/me').set(auth(session.accessToken));
    expect(me.body.adminRole).toBe('super_admin');

    const email = uniqueEmail('cliente');
    const register = await request(server).post('/api/auth/register').send({ email, name: 'Cliente', password: PASSWORD });
    expect(register.body.user).not.toHaveProperty('adminRole');
  });
});

describe('Alta y edición de roles (/api/admin/admins)', () => {
  it('crea con el rol pedido; sin rol, super_admin', async () => {
    const viewer = await createAdmin('viewer', 'orders_viewer');
    const full = await createAdmin('full');

    expect(viewer.body.adminRole).toBe('orders_viewer');
    expect(full.body.adminRole).toBe('super_admin');

    const list = await request(server).get('/api/admin/admins').set(auth(superToken));
    const roles = Object.fromEntries(list.body.map((admin: { id: string; adminRole: string }) => [admin.id, admin.adminRole]));
    expect(roles[viewer.id]).toBe('orders_viewer');
    expect(roles[full.id]).toBe('super_admin');
  });

  it('rechaza un rol inexistente', async () => {
    const response = await request(server)
      .post('/api/admin/admins')
      .set(auth(superToken))
      .send({ name: 'X', email: uniqueEmail('malrol'), password: PASSWORD, adminRole: 'dueño' });
    expect(response.status).toBe(400);
  });

  it('cambiar el rol rige enseguida, con el mismo token', async () => {
    const admin = await createAdmin('promovido', 'orders_viewer');
    expect((await request(server).get('/api/admin/customers').set(auth(admin.token))).status).toBe(403);

    const promoted = await request(server)
      .patch(`/api/admin/admins/${admin.id}`)
      .set(auth(superToken))
      .send({ adminRole: 'super_admin' });
    expect(promoted.status).toBe(200);
    expect(promoted.body.adminRole).toBe('super_admin');
    expect((await request(server).get('/api/admin/customers').set(auth(admin.token))).status).toBe(200);
  });

  it('nadie cambia su propio rol y el admin inicial sigue siendo super admin', async () => {
    const other = await createAdmin('otro-super');
    const seed = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });

    const self = await request(server)
      .patch(`/api/admin/admins/${other.id}`)
      .set(auth(other.token))
      .send({ adminRole: 'orders_viewer' });
    expect(self.status).toBe(409);

    const demoteSeed = await request(server)
      .patch(`/api/admin/admins/${seed.id}`)
      .set(auth(other.token))
      .send({ adminRole: 'orders_viewer' });
    expect(demoteSeed.status).toBe(409);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: seed.id } })).adminRole).toBe('super_admin');
  });
});

describe('orders_viewer: solo consulta pedidos', () => {
  let viewer: Awaited<ReturnType<typeof createAdmin>>;

  beforeAll(async () => {
    viewer = await createAdmin('solo-pedidos', 'orders_viewer');
  });

  it('ve el listado, el detalle y los estados de pedido', async () => {
    const list = await request(server).get('/api/admin/orders').set(auth(viewer.token));
    expect(list.status).toBe(200);

    const detail = await request(server).get(`/api/admin/orders/${orderId}`).set(auth(viewer.token));
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(orderId);

    expect((await request(server).get('/api/admin/order-statuses').set(auth(viewer.token))).status).toBe(200);
  });

  it('no cambia estados ni cancela; el pedido queda igual', async () => {
    const status = await request(server)
      .post(`/api/admin/orders/${orderId}/status`)
      .set(auth(viewer.token))
      .send({ status: 'confirmed' });
    expect(status.status).toBe(403);
    expect(status.body.message).toBe('Tu rol solo permite consultar pedidos');

    expect((await request(server).post(`/api/admin/orders/${orderId}/cancel`).set(auth(viewer.token))).status).toBe(403);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('pending');
  });

  it.each([
    ['get', '/api/admin/admins'],
    ['get', '/api/admin/customers'],
    ['get', '/api/admin/delivery-fees'],
    ['get', '/api/admin/parameters'],
    ['get', '/api/admin/promotions'],
    ['get', '/api/admin/reports/products'],
    ['post', '/api/admin/branches'],
    ['post', '/api/admin/products'],
    ['post', '/api/admin/categories'],
  ] as const)('%s %s responde 403', async (method, path) => {
    const response = await request(server)[method](path).set(auth(viewer.token));
    expect(response.status).toBe(403);
  });

  it('usa su perfil como cualquier usuario', async () => {
    const me = await request(server).get('/api/me').set(auth(viewer.token));
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ role: 'admin', adminRole: 'orders_viewer' });
  });
});
