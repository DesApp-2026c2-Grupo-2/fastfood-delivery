import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Parameter, Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { feeForDistance } from '../src/delivery-fees/delivery-fees.service';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

const stamp = Date.now();

// Mismas ubicaciones que fulfillment: NEAR queda a 1,11 km del cliente (se cobran 12 cuadras) y MID a 3,21 km (33).
const HOME = { latitude: -32.8895, longitude: -68.8458 };
const NEAR = { latitude: -32.8995, longitude: -68.8458 };
const MID = { latitude: -32.8895, longitude: -68.8114 };

const PARAMETER_KEYS = ['coverage_radius_km', 'delivery_price_per_km'];

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;

let adminToken: string;
let ana: { token: string; userId: string; addressId: string };
let near: { id: string };
let mid: { id: string };
let burger: { id: string };
// Lo que ya había en la base: los parámetros se pisan durante la suite y las promos activas se apagan.
let originalParameters: Parameter[] = [];
let preexistingActivePromos: string[] = [];
const createdPromotionIds: string[] = [];

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const admin = () => ({ ...auth(adminToken) });

function createBranch(name: string, location: { latitude: number; longitude: number }) {
  return prisma.branch.create({
    data: {
      name: `${name} ${stamp}`,
      address: 'Av. San Martín 100, Mendoza',
      ...location,
      openingHours: 'Lun-Dom 11:00-23:30',
      phone: '+54 261 400-0000',
    },
    select: { id: true },
  });
}

const patchPricePerKm = (value: unknown) =>
  request(server).patch('/api/admin/parameters').set(admin()).send({ delivery_price_per_km: value });

async function setPricePerKm(price: number) {
  expect((await patchPricePerKm(price)).status).toBe(200);
}

async function fillCart() {
  await prisma.cartItem.deleteMany({ where: { cart: { userId: ana.userId } } });
  const added = await request(server).post('/api/cart/items').set(auth(ana.token)).send({ productId: burger.id, quantity: 1 });
  expect(added.status).toBe(201);
}

const placeDelivery = (branchId: string) =>
  request(server).post('/api/orders').set(auth(ana.token)).send({ fulfillment: 'delivery', branchId, addressId: ana.addressId });

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

  originalParameters = await prisma.parameter.findMany({ where: { key: { in: PARAMETER_KEYS } } });
  await prisma.parameter.upsert({
    where: { key: 'coverage_radius_km' },
    update: { value: '5' },
    create: { key: 'coverage_radius_km', value: '5' },
  });
  const active = await prisma.promotion.findMany({ where: { active: true }, select: { id: true } });
  preexistingActivePromos = active.map((promotion) => promotion.id);
  await prisma.promotion.updateMany({ where: { id: { in: preexistingActivePromos } }, data: { active: false } });

  const login = await request(server).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(login.status).toBe(201);
  adminToken = login.body.accessToken;

  const hamburguesas = await prisma.category.upsert({
    where: { slug: 'hamburguesas' },
    update: {},
    create: { name: 'Hamburguesas', slug: 'hamburguesas' },
  });
  burger = await prisma.product.create({
    data: {
      name: `E2E Envio Hamburguesa ${stamp}`,
      slug: `e2e-envio-hamburguesa-${stamp}`,
      description: 'Producto de prueba',
      price: new Prisma.Decimal('10000.00'),
      categories: { connect: { id: hamburguesas.id } },
    },
    select: { id: true },
  });
  near = await createBranch('Sucursal E2E Envio Cerca', NEAR);
  mid = await createBranch('Sucursal E2E Envio Media', MID);
  for (const branch of [near, mid]) {
    await prisma.stock.create({ data: { branchId: branch.id, productId: burger.id, available: 100 } });
  }

  const register = await request(server)
    .post('/api/auth/register')
    .send({ email: `delivery-fees.e2e.ana.${stamp}@rapido.local`, name: 'Cliente Ana', password: 'Cliente123!' });
  expect(register.status).toBe(201);
  const token: string = register.body.accessToken;
  const address = await request(server)
    .post('/api/me/addresses')
    .set(auth(token))
    .send({ street: 'Av. San Martín 100, Mendoza', ...HOME, isDefault: true });
  expect(address.status).toBe(201);
  ana = { token, userId: register.body.user.id, addressId: address.body.id };
}, 60_000);

afterAll(async () => {
  await prisma.parameter.deleteMany({ where: { key: { in: PARAMETER_KEYS } } });
  for (const { key, value } of originalParameters) {
    await prisma.parameter.create({ data: { key, value } });
  }

  const branchIds = [near, mid].filter(Boolean).map((branch) => branch.id);
  const orders = await prisma.order.findMany({
    where: { branchId: { in: branchIds } },
    select: { id: true, userId: true, addressId: true },
  });
  await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
  const guestAddressIds = orders.flatMap((order) => (!order.userId && order.addressId ? [order.addressId] : []));
  await prisma.address.deleteMany({ where: { id: { in: guestAddressIds } } });
  await prisma.promotion.deleteMany({ where: { id: { in: createdPromotionIds } } });
  await prisma.promotion.updateMany({ where: { id: { in: preexistingActivePromos } }, data: { active: true } });
  if (ana) {
    await prisma.user.deleteMany({ where: { id: ana.userId } });
  }
  if (burger) {
    await prisma.product.deleteMany({ where: { id: burger.id } });
  }
  await prisma.branch.deleteMany({ where: { id: { in: branchIds } } });
  await app.close();
});

describe('feeForDistance', () => {
  it('cobra precio por km × km, por cuadra (100 m) iniciada', () => {
    expect(feeForDistance(1000, 0)).toBe(0);
    expect(feeForDistance(1000, 0.05)).toBe(100);
    expect(feeForDistance(1000, 0.1)).toBe(100);
    expect(feeForDistance(1000, 0.11)).toBe(200);
    expect(feeForDistance(1000, 5)).toBe(5000);
  });

  it('redondea la distancia a 2 decimales antes, como la que ve el cliente', () => {
    expect(feeForDistance(1000, 1.104)).toBe(1100);
    expect(feeForDistance(1000, 1.106)).toBe(1200);
  });

  it('redondea el precio a centavos; con precio 0 el envío es gratis', () => {
    expect(feeForDistance(333.33, 0.3)).toBe(100);
    expect(feeForDistance(0, 3)).toBe(0);
  });
});

describe('Precio por km en /api/admin/parameters', () => {
  it('se lista con los demás parámetros y se valida', async () => {
    await setPricePerKm(1500.5);
    const list = await request(server).get('/api/admin/parameters').set(admin());
    expect(list.body.find((parameter: { key: string }) => parameter.key === 'delivery_price_per_km')).toMatchObject({
      label: 'Precio de envío por km',
      unit: '$/km',
      value: 1500.5,
      min: 0,
    });

    expect((await patchPricePerKm(-1)).status).toBe(400);
    expect((await patchPricePerKm(10.123)).status).toBe(400);
    expect((await patchPricePerKm('caro')).status).toBe(400);
  });

  it('el ABM de tramos ya no existe', async () => {
    expect((await request(server).get('/api/admin/delivery-fees').set(admin())).status).toBe(404);
  });
});

describe('Envío en el pedido', () => {
  beforeEach(async () => {
    await setPricePerKm(1000);
  });

  it('domicilio cobra precio por km × distancia y lo suma al total; queda congelado', async () => {
    await fillCart();
    const response = await placeDelivery(mid.id);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ subtotal: 10000, discountAmount: 0, deliveryFee: 3300, totalAmount: 13300 });

    // Cambiar el precio después no toca el pedido.
    await setPricePerKm(5000);
    const mine = await request(server).get(`/api/orders/${response.body.id}`).set(auth(ana.token));
    expect(mine.body).toMatchObject({ deliveryFee: 3300, totalAmount: 13300 });
    const adminDetail = await request(server).get(`/api/admin/orders/${response.body.id}`).set(admin());
    expect(adminDetail.body).toMatchObject({ deliveryFee: 3300, totalAmount: 13300 });
  });

  it('retiro no paga envío', async () => {
    await fillCart();
    const response = await request(server)
      .post('/api/orders')
      .set(auth(ana.token))
      .send({ fulfillment: 'pickup', branchId: mid.id });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ deliveryFee: 0, totalAmount: 10000 });
  });

  it('con precio 0 el envío es gratis', async () => {
    await setPricePerKm(0);
    await fillCart();
    expect((await placeDelivery(near.id)).body).toMatchObject({ deliveryFee: 0, totalAmount: 10000 });
  });

  it('la promo descuenta solo los productos, no el envío', async () => {
    const promo = await request(server)
      .post('/api/admin/promotions')
      .set(admin())
      .send({ name: `Promo E2E Envio ${stamp}`, value: 10 });
    expect(promo.status).toBe(201);
    createdPromotionIds.push(promo.body.id);

    try {
      await fillCart();
      const response = await placeDelivery(near.id);
      expect(response.body).toMatchObject({ subtotal: 10000, discountAmount: 1000, deliveryFee: 1200, totalAmount: 10200 });
    } finally {
      await prisma.promotion.update({ where: { id: promo.body.id }, data: { active: false } });
    }
  });

  it('el invitado también paga envío a domicilio', async () => {
    const response = await request(server)
      .post('/api/orders/guest')
      .send({
        name: 'Invitado Envio',
        email: `guest.delivery-fees.e2e.${stamp}@rapido.local`,
        items: [{ productId: burger.id, quantity: 1 }],
        fulfillment: 'delivery',
        branchId: near.id,
        street: 'Av. San Martín 100, Mendoza',
        ...HOME,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ deliveryFee: 1200, totalAmount: 11200 });
  });

  it('el listado de sucursales del checkout muestra el envío de cada una', async () => {
    await fillCart();
    const mine = (branches: { id: string; deliveryFee: number }[]) => branches.filter((branch) => [near.id, mid.id].includes(branch.id));

    const delivery = await request(server)
      .post('/api/branches/checkout')
      .set(auth(ana.token))
      .send({ fulfillment: 'delivery', addressId: ana.addressId });
    expect(delivery.status).toBe(200);
    expect(mine(delivery.body.branches)).toEqual([
      expect.objectContaining({ id: near.id, deliveryFee: 1200 }),
      expect.objectContaining({ id: mid.id, deliveryFee: 3300 }),
    ]);

    const pickup = await request(server)
      .post('/api/branches/checkout')
      .set(auth(ana.token))
      .send({ fulfillment: 'pickup', addressId: ana.addressId });
    expect(mine(pickup.body.branches).map((branch) => branch.deliveryFee)).toEqual([0, 0]);
  });
});
