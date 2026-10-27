import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DeliveryFeeTier, Parameter, Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { feeForDistance } from '../src/delivery-fees/delivery-fees.service';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

const stamp = Date.now();

// Mismas ubicaciones que fulfillment: NEAR queda a ~1,1 km del cliente y MID a ~3,3 km.
const HOME = { latitude: -32.8895, longitude: -68.8458 };
const NEAR = { latitude: -32.8995, longitude: -68.8458 };
const MID = { latitude: -32.8895, longitude: -68.8114 };

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;

let adminToken: string;
let ana: { token: string; userId: string; addressId: string };
let near: { id: string };
let mid: { id: string };
let burger: { id: string };
// Lo que ya había en la base: los tramos se sacan durante la suite y las promos activas se apagan.
let originalTiers: DeliveryFeeTier[] = [];
let originalRadius: Parameter | null = null;
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

async function setTiers(tiers: { upToKm: number; price: number }[]) {
  await prisma.deliveryFeeTier.deleteMany();
  for (const tier of tiers) {
    const created = await request(server).post('/api/admin/delivery-fees').set(admin()).send(tier);
    expect(created.status).toBe(201);
  }
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

  originalTiers = await prisma.deliveryFeeTier.findMany();
  originalRadius = await prisma.parameter.findUnique({ where: { key: 'coverage_radius_km' } });
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
  await prisma.deliveryFeeTier.deleteMany();
  for (const { upToKm, price } of originalTiers) {
    await prisma.deliveryFeeTier.create({ data: { upToKm, price } });
  }
  if (originalRadius) {
    await prisma.parameter.update({ where: { key: 'coverage_radius_km' }, data: { value: originalRadius.value } });
  } else {
    await prisma.parameter.deleteMany({ where: { key: 'coverage_radius_km' } });
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
  const tiers = [
    { upToKm: 2, price: 500 },
    { upToKm: 4, price: 900 },
  ];

  it('cobra el primer tramo que cubre la distancia, con el tope incluido', () => {
    expect(feeForDistance(tiers, 0)).toBe(500);
    expect(feeForDistance(tiers, 2)).toBe(500);
    expect(feeForDistance(tiers, 2.01)).toBe(900);
    expect(feeForDistance(tiers, 4)).toBe(900);
  });

  it('redondea la distancia a 2 decimales, como la que ve el cliente', () => {
    expect(feeForDistance(tiers, 2.004)).toBe(500);
    expect(feeForDistance(tiers, 2.006)).toBe(900);
  });

  it('más lejos que el último tramo cobra el último; sin tramos es gratis', () => {
    expect(feeForDistance(tiers, 7)).toBe(900);
    expect(feeForDistance([], 3)).toBe(0);
  });
});

describe('ABM /api/admin/delivery-fees', () => {
  it('alta, listado ordenado con fromKm, edición y baja', async () => {
    await prisma.deliveryFeeTier.deleteMany();

    const far = await request(server).post('/api/admin/delivery-fees').set(admin()).send({ upToKm: 4, price: 900 });
    const close = await request(server).post('/api/admin/delivery-fees').set(admin()).send({ upToKm: 2, price: 500 });
    expect(far.status).toBe(201);
    expect(close.body).toMatchObject({ upToKm: 2, price: 500 });

    const list = await request(server).get('/api/admin/delivery-fees').set(admin());
    expect(list.status).toBe(200);
    expect(list.body).toEqual([
      { id: close.body.id, fromKm: 0, upToKm: 2, price: 500, updatedAt: expect.any(String) },
      { id: far.body.id, fromKm: 2, upToKm: 4, price: 900, updatedAt: expect.any(String) },
    ]);

    const edited = await request(server).patch(`/api/admin/delivery-fees/${far.body.id}`).set(admin()).send({ price: 950.5 });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ upToKm: 4, price: 950.5 });

    const removed = await request(server).delete(`/api/admin/delivery-fees/${close.body.id}`).set(admin());
    expect(removed.status).toBe(200);
    const after = await request(server).get('/api/admin/delivery-fees').set(admin());
    expect(after.body).toEqual([expect.objectContaining({ id: far.body.id, fromKm: 0, upToKm: 4 })]);
  });

  it('valida: tope repetido 409, valores fuera de rango 400, inexistente 404, sin cambios 400', async () => {
    await setTiers([{ upToKm: 3, price: 700 }]);
    const [tier] = (await request(server).get('/api/admin/delivery-fees').set(admin())).body;

    const post = (body: object) => request(server).post('/api/admin/delivery-fees').set(admin()).send(body);
    expect((await post({ upToKm: 3, price: 100 })).status).toBe(409);
    expect((await post({ upToKm: 0, price: 100 })).status).toBe(400);
    expect((await post({ upToKm: 5, price: -1 })).status).toBe(400);
    expect((await post({ upToKm: 5 })).status).toBe(400);
    expect((await post({ upToKm: 5.123, price: 100 })).status).toBe(400);

    expect((await request(server).patch('/api/admin/delivery-fees/no-existe').set(admin()).send({ price: 1 })).status).toBe(404);
    expect((await request(server).patch(`/api/admin/delivery-fees/${tier.id}`).set(admin()).send({})).status).toBe(400);
    expect((await request(server).delete('/api/admin/delivery-fees/no-existe').set(admin())).status).toBe(404);
  });

  it('es solo para admins', async () => {
    expect((await request(server).get('/api/admin/delivery-fees')).status).toBe(401);
    expect((await request(server).get('/api/admin/delivery-fees').set(auth(ana.token))).status).toBe(403);
  });
});

describe('Envío en el pedido', () => {
  beforeEach(async () => {
    await setTiers([
      { upToKm: 2, price: 500 },
      { upToKm: 4, price: 900 },
    ]);
  });

  it('domicilio cobra el tramo de la distancia y lo suma al total; queda congelado', async () => {
    await fillCart();
    const response = await placeDelivery(mid.id);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ subtotal: 10000, discountAmount: 0, deliveryFee: 900, totalAmount: 10900 });

    // Cambiar los tramos después no toca el pedido.
    await setTiers([{ upToKm: 10, price: 5000 }]);
    const mine = await request(server).get(`/api/orders/${response.body.id}`).set(auth(ana.token));
    expect(mine.body).toMatchObject({ deliveryFee: 900, totalAmount: 10900 });
    const adminDetail = await request(server).get(`/api/admin/orders/${response.body.id}`).set(admin());
    expect(adminDetail.body).toMatchObject({ deliveryFee: 900, totalAmount: 10900 });
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

  it('más lejos que el último tramo cobra el último; sin tramos es gratis', async () => {
    await setTiers([{ upToKm: 1, price: 300 }]);
    await fillCart();
    expect((await placeDelivery(near.id)).body).toMatchObject({ deliveryFee: 300, totalAmount: 10300 });

    await setTiers([]);
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
      expect(response.body).toMatchObject({ subtotal: 10000, discountAmount: 1000, deliveryFee: 500, totalAmount: 9500 });
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
    expect(response.body).toMatchObject({ deliveryFee: 500, totalAmount: 10500 });
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
      expect.objectContaining({ id: near.id, deliveryFee: 500 }),
      expect.objectContaining({ id: mid.id, deliveryFee: 900 }),
    ]);

    const pickup = await request(server)
      .post('/api/branches/checkout')
      .set(auth(ana.token))
      .send({ fulfillment: 'pickup', addressId: ana.addressId });
    expect(mine(pickup.body.branches).map((branch) => branch.deliveryFee)).toEqual([0, 0]);
  });
});
