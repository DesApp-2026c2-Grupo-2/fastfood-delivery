import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';
const EMAIL_PREFIX = 'alias.e2e.';
const PASSWORD = 'Cliente123!';
const STREET = 'Av. Rivadavia 5000, CABA';

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;
let adminToken: string;
let productId: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function uniqueEmail(name: string) {
  return `${EMAIL_PREFIX}${name}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@rapido.local`;
}

async function registerCustomer() {
  const email = uniqueEmail('cliente');
  const response = await request(server)
    .post('/api/auth/register')
    .send({ email, name: 'Cliente alias', password: PASSWORD });
  expect(response.status).toBe(201);
  return { email, id: response.body.user.id as string, token: response.body.accessToken as string };
}

function createAddress(token: string, body: object) {
  return request(server).post('/api/me/addresses').set(auth(token)).send(body);
}

const place = { street: STREET, latitude: -34.61, longitude: -58.42 };

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

  const admin = await request(server).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(admin.status).toBe(201);
  adminToken = admin.body.accessToken;

  const category = await prisma.category.findFirstOrThrow({ select: { id: true } });
  const stamp = Date.now();
  const product = await prisma.product.create({
    data: {
      name: `Alias e2e ${stamp}`,
      slug: `alias-e2e-${stamp}`,
      description: 'Producto para probar el alias',
      price: new Prisma.Decimal('1000'),
      categories: { connect: { id: category.id } },
    },
    select: { id: true },
  });
  productId = product.id;

  const branches = await prisma.branch.findMany({ where: { active: true }, select: { id: true } });
  for (const branch of branches) {
    await prisma.stock.create({ data: { branchId: branch.id, productId, available: 1000 } });
  }
}, 30_000);

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length > 0) {
    const orders = await prisma.order.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
    const orderIds = orders.map((order) => order.id);
    if (orderIds.length > 0) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    await prisma.address.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (productId) {
    await prisma.product.delete({ where: { id: productId } });
  }
  await app.close();
});

describe('Alias de dirección', () => {
  it('guarda el alias recortado y, si no viene, queda vacío', async () => {
    const customer = await registerCustomer();

    const named = await createAddress(customer.token, { ...place, alias: '  Casa  ' });
    expect(named.status).toBe(201);
    expect(named.body.alias).toBe('Casa');
    expect(named.body.street).toBe(STREET);

    const plain = await createAddress(customer.token, place);
    expect(plain.status).toBe(201);
    expect(plain.body.alias).toBe('');

    const list = await request(server).get('/api/me/addresses').set(auth(customer.token));
    expect(list.status).toBe(200);
    expect(list.body.map((address: { alias: string }) => address.alias)).toEqual(expect.arrayContaining(['Casa', '']));
  });

  it('cambia el alias y lo puede dejar vacío', async () => {
    const customer = await registerCustomer();
    const created = await createAddress(customer.token, { ...place, alias: 'Casa' });
    expect(created.status).toBe(201);

    const renamed = await request(server)
      .patch(`/api/me/addresses/${created.body.id}`)
      .set(auth(customer.token))
      .send({ alias: 'Trabajo' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.alias).toBe('Trabajo');

    const cleared = await request(server)
      .patch(`/api/me/addresses/${created.body.id}`)
      .set(auth(customer.token))
      .send({ alias: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body.alias).toBe('');
  });

  it('rechaza un alias de más de 40 caracteres', async () => {
    const customer = await registerCustomer();
    const response = await createAddress(customer.token, { ...place, alias: 'a'.repeat(41) });
    expect(response.status).toBe(400);
  });

  it('el pedido del cliente y el del admin muestran el alias', async () => {
    const customer = await registerCustomer();
    const address = await createAddress(customer.token, { ...place, alias: 'Casa', isDefault: true });
    expect(address.status).toBe(201);

    const cart = await request(server)
      .post('/api/cart/items')
      .set(auth(customer.token))
      .send({ productId, quantity: 1 });
    expect(cart.status).toBe(201);

    const created = await request(server)
      .post('/api/orders')
      .set(auth(customer.token))
      .send({ addressId: address.body.id });
    expect(created.status).toBe(201);
    expect(created.body.address).toMatchObject({ alias: 'Casa', street: STREET });

    const mine = await request(server).get(`/api/orders/${created.body.id}`).set(auth(customer.token));
    expect(mine.status).toBe(200);
    expect(mine.body.address.alias).toBe('Casa');

    const admin = await request(server).get(`/api/admin/orders/${created.body.id}`).set(auth(adminToken));
    expect(admin.status).toBe(200);
    expect(admin.body.address.alias).toBe('Casa');
  });
});
