import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { OrderStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

// Todos los usuarios de este archivo empiezan así; al final se borran por ese prefijo.
const EMAIL_PREFIX = 'customers.e2e.';
const PASSWORD = 'Cliente123!';
const stamp = Date.now();

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;
let adminToken: string;
let branchId: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function uniqueEmail(alias: string) {
  return `${EMAIL_PREFIX}${alias}.${stamp}.${Math.random().toString(36).slice(2, 8)}@rapido.local`;
}

async function registerCustomer(alias: string) {
  const email = uniqueEmail(alias);
  const response = await request(server)
    .post('/api/auth/register')
    .send({ email, name: `Cliente ${alias} ${stamp}`, password: PASSWORD });
  expect(response.status).toBe(201);
  return { email, id: response.body.user.id as string, token: response.body.accessToken as string };
}

// Pedido de retiro cargado directo en la base: acá solo importan el cliente, el estado y el importe.
function createOrder(userId: string, totalAmount: number, status: OrderStatus = OrderStatus.delivered) {
  return prisma.order.create({
    data: {
      userId,
      branchId,
      fulfillment: 'pickup',
      status,
      subtotal: totalAmount,
      totalAmount,
      estimatedDeliveryAt: new Date(),
    },
  });
}

const list = (query: object = {}) => request(server).get('/api/admin/customers').query(query).set(auth(adminToken));

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

  const login = await request(server).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(login.status).toBe(201);
  adminToken = login.body.accessToken;

  const branch = await prisma.branch.create({
    data: {
      name: `Sucursal Clientes E2E ${stamp}`,
      address: 'Calle E2E 123',
      latitude: -34.6,
      longitude: -58.4,
      openingHours: '10-22',
      phone: '1111-1111',
    },
  });
  branchId = branch.id;
});

afterAll(async () => {
  const users = { email: { startsWith: EMAIL_PREFIX } };
  await prisma.order.deleteMany({ where: { user: users } });
  await prisma.user.deleteMany({ where: users });
  if (branchId) {
    await prisma.branch.delete({ where: { id: branchId } });
  }
  await app.close();
});

describe('GET /api/admin/customers', () => {
  it('lista clientes con cantidad de compras, total gastado y último pedido, sin contar cancelados', async () => {
    const buyer = await registerCustomer('comprador');
    await createOrder(buyer.id, 1000);
    const last = await createOrder(buyer.id, 500, OrderStatus.pending);
    await createOrder(buyer.id, 9999, OrderStatus.cancelled);

    const response = await list({ q: buyer.email });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).toEqual({
      id: buyer.id,
      name: `Cliente comprador ${stamp}`,
      email: buyer.email,
      active: true,
      createdAt: expect.any(String),
      orderCount: 2,
      totalSpent: 1500,
      lastOrderAt: last.createdAt.toISOString(),
    });
  });

  it('withOrders=true deja solo a los que compraron (un pedido cancelado no cuenta)', async () => {
    const buyer = await registerCustomer('conpedido');
    const cancelledOnly = await registerCustomer('cancelado');
    const never = await registerCustomer('nunca');
    await createOrder(buyer.id, 800);
    await createOrder(cancelledOnly.id, 800, OrderStatus.cancelled);

    const response = await list({ q: `${EMAIL_PREFIX}`, withOrders: 'true' });

    const ids = response.body.items.map((item: { id: string }) => item.id);
    expect(ids).toContain(buyer.id);
    expect(ids).not.toContain(cancelledOnly.id);
    expect(ids).not.toContain(never.id);

    const all = await list({ q: never.email });
    expect(all.body.items[0]).toMatchObject({ orderCount: 0, totalSpent: 0, lastOrderAt: null });
  });

  it('no incluye administradores y filtra por estado', async () => {
    const admins = await list({ q: ADMIN_EMAIL });
    expect(admins.body.total).toBe(0);

    const disabled = await registerCustomer('filtro');
    await prisma.user.update({ where: { id: disabled.id }, data: { active: false } });

    const inactive = await list({ q: disabled.email, active: 'false' });
    const active = await list({ q: disabled.email, active: 'true' });
    expect(inactive.body.items.map((item: { id: string }) => item.id)).toEqual([disabled.id]);
    expect(active.body.total).toBe(0);

    expect((await list({ active: 'quizas' })).status).toBe(400);
  });

  it('es solo para admins', async () => {
    const customer = await registerCustomer('curioso');
    expect((await request(server).get('/api/admin/customers')).status).toBe(401);
    expect((await request(server).get('/api/admin/customers').set(auth(customer.token))).status).toBe(403);
  });
});

describe('GET /api/admin/customers/:id', () => {
  it('devuelve datos, direcciones y pedidos recientes', async () => {
    const customer = await registerCustomer('detalle');
    await prisma.address.create({
      data: { userId: customer.id, alias: 'Casa', street: 'Av. E2E 1', latitude: -34.6, longitude: -58.4, isDefault: true },
    });
    const order = await createOrder(customer.id, 1200);

    const response = await request(server).get(`/api/admin/customers/${customer.id}`).set(auth(adminToken));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: customer.id, email: customer.email, orderCount: 1, totalSpent: 1200 });
    expect(response.body.addresses).toEqual([
      { id: expect.any(String), alias: 'Casa', street: 'Av. E2E 1', isDefault: true },
    ]);
    expect(response.body.recentOrders).toEqual([
      {
        id: order.id,
        status: 'delivered',
        fulfillment: 'pickup',
        totalAmount: 1200,
        createdAt: order.createdAt.toISOString(),
        branch: { id: branchId, name: `Sucursal Clientes E2E ${stamp}` },
      },
    ]);
  });

  it('un admin o un id inexistente dan 404', async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
    expect((await request(server).get(`/api/admin/customers/${admin.id}`).set(auth(adminToken))).status).toBe(404);
    expect((await request(server).get('/api/admin/customers/no-existe').set(auth(adminToken))).status).toBe(404);
  });
});

describe('PATCH /api/admin/customers/:id', () => {
  const patch = (id: string, body: object) =>
    request(server).patch(`/api/admin/customers/${id}`).set(auth(adminToken)).send(body);

  it('cambia nombre y email, y el cliente entra con el email nuevo', async () => {
    const customer = await registerCustomer('editar');
    const newEmail = uniqueEmail('editado');

    const response = await patch(customer.id, { name: '  Nombre Nuevo  ', email: newEmail.toUpperCase() });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Nombre Nuevo', email: newEmail });
    const login = await request(server).post('/api/auth/login').send({ email: newEmail, password: PASSWORD });
    expect(login.status).toBe(201);
  });

  it('rechaza un email ya usado (también el de un admin), un cuerpo vacío y la contraseña', async () => {
    const customer = await registerCustomer('repetido');
    const other = await registerCustomer('otro');

    expect((await patch(customer.id, { email: other.email })).status).toBe(409);
    expect((await patch(customer.id, { email: ADMIN_EMAIL })).status).toBe(409);
    expect((await patch(customer.id, {})).status).toBe(400);
    expect((await patch(customer.id, { password: 'Nueva123!' })).status).toBe(400);
  });
});

describe('PATCH /api/admin/customers/:id/status (baja lógica)', () => {
  const setStatus = (id: string, active: unknown) =>
    request(server).patch(`/api/admin/customers/${id}/status`).set(auth(adminToken)).send({ active });

  it('deshabilitado: no inicia sesión, su token deja de servir y no recupera contraseña; los pedidos quedan', async () => {
    const customer = await registerCustomer('baja');
    const order = await createOrder(customer.id, 700);

    const disabled = await setStatus(customer.id, false);
    expect(disabled.status).toBe(200);
    expect(disabled.body).toMatchObject({ active: false, orderCount: 1 });

    const login = await request(server).post('/api/auth/login').send({ email: customer.email, password: PASSWORD });
    expect(login.status).toBe(403);
    // Con la contraseña mal sigue siendo 401: no se revela que la cuenta existe y está deshabilitada.
    const wrong = await request(server).post('/api/auth/login').send({ email: customer.email, password: 'Otra123!' });
    expect(wrong.status).toBe(401);
    expect((await request(server).get('/api/me').set(auth(customer.token))).status).toBe(401);

    const forgot = await request(server).post('/api/auth/forgot-password').send({ email: customer.email });
    expect(forgot.status).toBe(200);
    expect(forgot.body.demo).toBeUndefined();

    expect(await prisma.order.findUnique({ where: { id: order.id } })).not.toBeNull();
    expect((await request(server).get(`/api/admin/orders/${order.id}`).set(auth(adminToken))).status).toBe(200);

    // Rehabilitado vuelve a entrar.
    expect((await setStatus(customer.id, true)).body.active).toBe(true);
    const again = await request(server).post('/api/auth/login').send({ email: customer.email, password: PASSWORD });
    expect(again.status).toBe(201);
  });

  it('valida el cuerpo y no deja deshabilitar admins', async () => {
    const customer = await registerCustomer('valida');
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });

    expect((await setStatus(customer.id, 'no')).status).toBe(400);
    expect((await setStatus(customer.id, 'false')).status).toBe(400);
    expect((await setStatus(admin.id, false)).status).toBe(404);
  });
});

describe('POST /api/admin/customers', () => {
  it('crea un cliente que puede entrar, y rechaza un email repetido', async () => {
    const email = uniqueEmail('alta');
    const created = await request(server)
      .post('/api/admin/customers')
      .set(auth(adminToken))
      .send({ name: '  Cliente Alta  ', email: email.toUpperCase(), password: PASSWORD });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Cliente Alta', email, active: true, orderCount: 0 });

    const login = await request(server).post('/api/auth/login').send({ email, password: PASSWORD });
    expect(login.status).toBe(201);

    const duplicate = await request(server)
      .post('/api/admin/customers')
      .set(auth(adminToken))
      .send({ name: 'Otro', email, password: PASSWORD });
    expect(duplicate.status).toBe(409);
  });
});
