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

const stamp = Date.now();
const TOP3_STARTED_AT_KEY = 'top3_campaign_started_at';

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;

type Customer = { token: string; userId: string };

let adminToken: string;
let ana: Customer;
let beto: Customer;
let cari: Customer;
let danny: Customer;
let branch: { id: string };
let burger: { id: string };
let preexistingActive: string[] = [];
const createdPromotionIds: string[] = [];
const PARAMETER_KEYS = [
  TOP3_STARTED_AT_KEY,
  'loyalty_campaign_active',
  'loyalty_orders_required',
  'loyalty_min_order_amount',
  'loyalty_discount_percent',
  'top3_discount_percent',
];
let savedParameters: { key: string; value: string }[] | null = null;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function registerCustomer(alias: string): Promise<Customer> {
  const register = await request(server)
    .post('/api/auth/register')
    .send({
      email: `loyalty.e2e.${alias}.${stamp}@rapido.local`,
      name: `Cliente ${alias}`,
      password: 'Cliente123!',
    });
  expect(register.status).toBe(201);
  return { token: register.body.accessToken, userId: register.body.user.id };
}

async function placePickup(customer: Customer, quantity = 1) {
  const added = await request(server)
    .post('/api/cart/items')
    .set(auth(customer.token))
    .send({ productId: burger.id, quantity });
  expect(added.status).toBe(201);
  const order = await request(server)
    .post('/api/orders')
    .set(auth(customer.token))
    .send({ fulfillment: 'pickup', branchId: branch.id });
  expect(order.status).toBe(201);
  return order.body as {
    id: string;
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    promotionName: string | null;
    loyalty?: {
      stamps: number;
      progress: number;
      qualifiesThisOrder: boolean;
      rewardOnThisOrder: boolean;
    };
  };
}

async function stampsOf(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { loyaltyStamps: true, hasTopBuyerReward: true },
  });
  return user;
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
  savedParameters = await prisma.parameter.findMany({
    where: { key: { in: PARAMETER_KEYS } },
    select: { key: true, value: true },
  });

  const active = await prisma.promotion.findMany({ where: { active: true }, select: { id: true } });
  preexistingActive = active.map((promotion) => promotion.id);
  await prisma.promotion.updateMany({ where: { id: { in: preexistingActive } }, data: { active: false } });

  const hamburguesas = await prisma.category.upsert({
    where: { slug: 'hamburguesas' },
    update: {},
    create: { name: 'Hamburguesas', slug: 'hamburguesas' },
  });
  burger = await prisma.product.create({
    data: {
      name: `E2E Loyalty Burger ${stamp}`,
      slug: `e2e-loyalty-burger-${stamp}`,
      description: 'Producto de prueba',
      price: new Prisma.Decimal('10000.00'),
      categories: { connect: { id: hamburguesas.id } },
    },
    select: { id: true },
  });
  branch = await prisma.branch.create({
    data: {
      name: `Sucursal E2E Loyalty ${stamp}`,
      address: 'Av. San Martín 100, Mendoza',
      latitude: -32.8895,
      longitude: -68.8458,
      openingHours: 'Lun-Dom 11:00-23:30',
      phone: '+54 261 400-0000',
    },
    select: { id: true },
  });
  await prisma.stock.create({ data: { branchId: branch.id, productId: burger.id, available: 500 } });

  const login = await request(server).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(login.status).toBe(201);
  adminToken = login.body.accessToken;

  ana = await registerCustomer('ana');
  beto = await registerCustomer('beto');
  cari = await registerCustomer('cari');
  danny = await registerCustomer('danny');
}, 60_000);

beforeEach(async () => {
  await prisma.cartItem.deleteMany({
    where: { cart: { userId: { in: [ana.userId, beto.userId, cari.userId, danny.userId] } } },
  });
  await prisma.promotion.updateMany({ where: { id: { in: createdPromotionIds } }, data: { active: false } });
  await prisma.parameter.deleteMany({ where: { key: { in: [TOP3_STARTED_AT_KEY, 'loyalty_campaign_active'] } } });
  await prisma.user.updateMany({
    where: { id: { in: [ana.userId, beto.userId, cari.userId, danny.userId] } },
    data: { loyaltyStamps: 0, hasTopBuyerReward: false },
  });
  await prisma.parameter.upsert({
    where: { key: 'loyalty_orders_required' },
    update: { value: '3' },
    create: { key: 'loyalty_orders_required', value: '3' },
  });
  await prisma.parameter.upsert({
    where: { key: 'loyalty_min_order_amount' },
    update: { value: '0' },
    create: { key: 'loyalty_min_order_amount', value: '0' },
  });
  await prisma.parameter.upsert({
    where: { key: 'loyalty_discount_percent' },
    update: { value: '30' },
    create: { key: 'loyalty_discount_percent', value: '30' },
  });
  await prisma.parameter.upsert({
    where: { key: 'top3_discount_percent' },
    update: { value: '15' },
    create: { key: 'top3_discount_percent', value: '15' },
  });
});

afterAll(async () => {
  if (savedParameters) {
    await prisma.parameter.deleteMany({ where: { key: { in: PARAMETER_KEYS } } });
    if (savedParameters.length > 0) {
      await prisma.parameter.createMany({ data: savedParameters });
    }
  }
  if (branch) {
    const orders = await prisma.order.findMany({
      where: { branchId: branch.id },
      select: { id: true },
    });
    await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
  }
  await prisma.promotion.deleteMany({ where: { id: { in: createdPromotionIds } } });
  await prisma.promotion.updateMany({ where: { id: { in: preexistingActive } }, data: { active: true } });
  await prisma.user.deleteMany({
    where: { id: { in: [ana, beto, cari, danny].filter(Boolean).map((c) => c.userId) } },
  });
  if (burger) await prisma.product.deleteMany({ where: { id: burger.id } });
  if (branch) await prisma.branch.deleteMany({ where: { id: branch.id } });
  await app.close();
});

describe('Fidelización por sellos', () => {
  it('el sello se suma al crear el pedido', async () => {
    const order = await placePickup(ana);
    expect(order.loyalty).toMatchObject({ stamps: 1, progress: 1, qualifiesThisOrder: true });
    expect(await stampsOf(ana.userId)).toMatchObject({ loyaltyStamps: 1 });

    const me = await request(server).get('/api/me').set(auth(ana.token));
    expect(me.body).toMatchObject({ loyaltyStamps: 1, hasTopBuyerReward: false });
  });

  it('al alcanzar la meta aplica el descuento de fidelidad en ese pedido', async () => {
    await prisma.user.update({ where: { id: ana.userId }, data: { loyaltyStamps: 2 } });

    const order = await placePickup(ana);
    expect(order).toMatchObject({
      subtotal: 10000,
      discountAmount: 3000,
      totalAmount: 7000,
    });
    expect(order.promotionName).toBe('Premio Fidelidad');
    expect(await stampsOf(ana.userId)).toMatchObject({ loyaltyStamps: 3 });
    expect(order.loyalty).toMatchObject({ stamps: 3, progress: 3, rewardOnThisOrder: true });
  });

  it('el detalle y el listado distinguen el sello del premio', async () => {
    const plain = await placePickup(ana);
    const plainDetail = await request(server).get(`/api/orders/${plain.id}`).set(auth(ana.token));
    expect(plainDetail.status).toBe(200);
    expect(plainDetail.body.loyalty).toEqual({
      stamps: 1,
      progress: 1,
      ordersRequired: 3,
      minOrderAmount: 0,
      qualifiesThisOrder: true,
      rewardOnThisOrder: false,
    });
    const list = await request(server).get('/api/orders').set(auth(ana.token));
    expect(list.body.find((row: { id: string }) => row.id === plain.id).loyaltyStampGranted).toBe(true);

    await prisma.user.update({ where: { id: ana.userId }, data: { loyaltyStamps: 2 } });
    const reward = await placePickup(ana);
    expect(reward.promotionName).toBe('Premio Fidelidad');
    const rewardDetail = await request(server).get(`/api/orders/${reward.id}`).set(auth(ana.token));
    expect(rewardDetail.body.loyalty).toMatchObject({
      stamps: 3,
      progress: 3,
      ordersRequired: 3,
      qualifiesThisOrder: true,
      rewardOnThisOrder: true,
    });
  });

  it('la página pública no revela el porcentaje de los premios', async () => {
    const started = await request(server)
      .post('/api/admin/promotions/top3-campaign/start')
      .set(auth(adminToken));
    expect(started.status).toBe(201);

    const response = await request(server).get('/api/promotions/active');
    expect(response.status).toBe(200);
    expect(response.body.loyalty).toEqual({ ordersRequired: 3, minOrderAmount: 0 });
    expect(response.body.top3).toEqual({ active: true });
    expect(JSON.stringify(response.body)).not.toContain('discountPercent');
  });

  it('si el pedido se cancela se revierte el sello', async () => {
    const order = await placePickup(ana);
    expect(await stampsOf(ana.userId)).toMatchObject({ loyaltyStamps: 1 });

    const cancelled = await request(server).post(`/api/orders/${order.id}/cancel`).set(auth(ana.token));
    expect(cancelled.status).toBe(200);
    expect(await stampsOf(ana.userId)).toMatchObject({ loyaltyStamps: 0 });
  });
});

describe('Campaña Top 3 compradores', () => {
  it('start / ranking / award premia a los 3 con más gasto desde el pedido y limpia premios viejos', async () => {
    // Premio de una campaña anterior que no debería sobrevivir al award.
    await prisma.user.update({ where: { id: danny.userId }, data: { hasTopBuyerReward: true } });

    const started = await request(server)
      .post('/api/admin/promotions/top3-campaign/start')
      .set(auth(adminToken));
    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({ active: true, discountPercent: 15 });

    const conflict = await request(server)
      .post('/api/admin/promotions/top3-campaign/start')
      .set(auth(adminToken));
    expect(conflict.status).toBe(409);

    // Gasto al crear: ana 30000, beto 20000, cari 10000. danny no compra.
    await placePickup(ana, 3);
    await placePickup(beto, 2);
    const cariOrder = await placePickup(cari, 1);

    let status = await request(server).get('/api/admin/promotions/top3-campaign').set(auth(adminToken));
    expect(status.status).toBe(200);
    expect(status.body.ranking.slice(0, 3).map((row: { userId: string }) => row.userId)).toEqual([
      ana.userId,
      beto.userId,
      cari.userId,
    ]);

    // Si cari cancela, su monto sale del ranking en ese momento.
    const cancelled = await request(server).post(`/api/orders/${cariOrder.id}/cancel`).set(auth(cari.token));
    expect(cancelled.status).toBe(200);
    status = await request(server).get('/api/admin/promotions/top3-campaign').set(auth(adminToken));
    expect(status.body.ranking.map((row: { userId: string }) => row.userId)).toEqual([
      ana.userId,
      beto.userId,
    ]);

    const awarded = await request(server)
      .post('/api/admin/promotions/top3-campaign/award')
      .set(auth(adminToken));
    expect(awarded.status).toBe(201);
    expect(awarded.body.awardedUsers).toHaveLength(2);

    const after = await request(server).get('/api/admin/promotions/top3-campaign').set(auth(adminToken));
    expect(after.body.active).toBe(false);

    expect(await stampsOf(ana.userId)).toMatchObject({ hasTopBuyerReward: true });
    expect(await stampsOf(beto.userId)).toMatchObject({ hasTopBuyerReward: true });
    expect(await stampsOf(cari.userId)).toMatchObject({ hasTopBuyerReward: false });
    expect(await stampsOf(danny.userId)).toMatchObject({ hasTopBuyerReward: false });
  });

  it('el premio Top 3 se aplica una sola vez y se consume al confirmar el pedido', async () => {
    await prisma.parameter.upsert({
      where: { key: 'top3_discount_percent' },
      update: { value: '20' },
      create: { key: 'top3_discount_percent', value: '20' },
    });
    await prisma.user.update({ where: { id: ana.userId }, data: { hasTopBuyerReward: true } });

    const first = await placePickup(ana);
    expect(first).toMatchObject({ discountAmount: 2000, totalAmount: 8000 });
    expect(first.promotionName).toBe('Premio Top 3');
    expect(await stampsOf(ana.userId)).toMatchObject({ hasTopBuyerReward: false });

    const second = await placePickup(ana);
    expect(second.discountAmount).toBe(0);
    expect(second.promotionName).toBeNull();
  });

  it('con la campaña de sellos finalizada no suma sello ni aplica el premio', async () => {
    const finished = await request(server)
      .post('/api/admin/promotions/loyalty-campaign/finish')
      .set(auth(adminToken));
    expect(finished.status).toBe(201);
    expect(finished.body.active).toBe(false);

    await prisma.user.update({ where: { id: ana.userId }, data: { loyaltyStamps: 2 } });
    const order = await placePickup(ana);
    expect(order.loyalty?.qualifiesThisOrder).toBe(false);
    expect(order.promotionName).toBeNull();
    expect(await stampsOf(ana.userId)).toMatchObject({ loyaltyStamps: 2 });

    const detail = await request(server).get(`/api/orders/${order.id}`).set(auth(ana.token));
    expect(detail.body.loyalty).toBeNull();
    const list = await request(server).get('/api/orders').set(auth(ana.token));
    expect(list.body.find((row: { id: string }) => row.id === order.id).loyaltyStampGranted).toBe(false);

    const started = await request(server)
      .post('/api/admin/promotions/loyalty-campaign/start')
      .set(auth(adminToken));
    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({ active: true, ordersRequired: 3, discountPercent: 30 });
  });

  it('award sin campaña activa responde 400', async () => {
    const response = await request(server)
      .post('/api/admin/promotions/top3-campaign/award')
      .set(auth(adminToken));
    expect(response.status).toBe(400);
  });
});
