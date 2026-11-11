import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { OrderStatus, Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { coveringBranchId } from './support/covering-branch';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

const stamp = Date.now();

type Customer = { token: string; userId: string; addressId: string };

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;
let adminToken: string;
let ana: Customer;
let beto: Customer;
let branchId: string;
let createdBranchId: string | undefined;
let categoryId: string;
let drink: { id: string };

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function registerCustomer(alias: string): Promise<Customer> {
  const register = await request(server)
    .post('/api/auth/register')
    .send({ email: `incidents.e2e.${alias}.${stamp}@rapido.local`, name: `Cliente ${alias}`, password: 'Cliente123!' });
  expect(register.status).toBe(201);
  const token: string = register.body.accessToken;

  const address = await request(server)
    .post('/api/me/addresses')
    .set(auth(token))
    .send({ street: 'Av. Rivadavia 5000, CABA', latitude: -34.61, longitude: -58.42, isDefault: true });
  expect(address.status).toBe(201);

  return { token, userId: register.body.user.id, addressId: address.body.id };
}

async function placeOrder(customer: Customer) {
  const added = await request(server)
    .post('/api/cart/items')
    .set(auth(customer.token))
    .send({ productId: drink.id, quantity: 1 });
  expect(added.status).toBe(201);
  const order = await request(server)
    .post('/api/orders')
    .set(auth(customer.token))
    .send({ fulfillment: 'delivery', branchId, addressId: customer.addressId });
  expect(order.status).toBe(201);
  return order.body.id as string;
}

async function deliveredOrder(customer: Customer) {
  const orderId = await placeOrder(customer);
  const steps: OrderStatus[] = ['confirmed', 'preparing', 'ready', 'on_the_way', 'delivered'];
  for (const status of steps) {
    const response = await request(server)
      .post(`/api/admin/orders/${orderId}/status`)
      .set(auth(adminToken))
      .send({ status });
    expect(response.status).toBe(201);
  }
  return orderId;
}

const report = (customer: Customer, orderId: string, body: object) =>
  request(server).post(`/api/orders/${orderId}/incident`).set(auth(customer.token)).send(body);

const adminList = (query: object = {}) =>
  request(server).get('/api/admin/incidents').query(query).set(auth(adminToken));

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

  const category = await prisma.category.create({
    data: { name: `E2E Reclamos ${stamp}`, slug: `e2e-reclamos-${stamp}` },
  });
  categoryId = category.id;
  drink = await prisma.product.create({
    data: {
      name: `E2E Reclamos Gaseosa ${stamp}`,
      slug: `e2e-reclamos-gaseosa-${stamp}`,
      description: 'Producto de prueba',
      price: new Prisma.Decimal('1500.00'),
      categories: { connect: { id: category.id } },
    },
    select: { id: true },
  });

  let branch = await prisma.branch.findFirst({ where: { active: true } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: `Sucursal E2E Reclamos ${stamp}`,
        address: 'Av. Corrientes 1234, CABA',
        latitude: -34.6037,
        longitude: -58.3816,
        openingHours: 'Lun-Dom 10:00-23:00',
        phone: '+54 11 4000-0000',
        active: true,
      },
    });
    createdBranchId = branch.id;
  }
  const activeBranches = await prisma.branch.findMany({ where: { active: true }, select: { id: true } });
  await prisma.stock.createMany({
    data: activeBranches.map((active) => ({ branchId: active.id, productId: drink.id, available: 1000 })),
  });

  const login = await request(server).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(login.status).toBe(201);
  adminToken = login.body.accessToken;

  ana = await registerCustomer('ana');
  beto = await registerCustomer('beto');
  branchId = await coveringBranchId(server, -34.61, -58.42);
}, 60_000);

afterAll(async () => {
  const userIds = [ana, beto].filter(Boolean).map((customer) => customer.userId);
  // Borrar los pedidos se lleva los reclamos (onDelete: Cascade).
  await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.product.deleteMany({ where: { id: drink.id } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  if (createdBranchId) {
    await prisma.branch.deleteMany({ where: { id: createdBranchId } });
  }
  await app.close();
});

describe('POST /api/orders/:id/incident (HU-36)', () => {
  it('reporta un problema en un pedido entregado y el detalle lo informa', async () => {
    const orderId = await deliveredOrder(ana);

    const before = await request(server).get(`/api/orders/${orderId}`).set(auth(ana.token));
    expect(before.body).toMatchObject({ incident: null, canReportIncident: true });

    const response = await report(ana, orderId, { reason: 'cold', message: 'Llegó frío' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      reason: 'cold',
      message: 'Llegó frío',
      status: 'open',
      response: '',
      coupon: null,
      createdAt: expect.any(String),
      resolvedAt: null,
      responseUnseen: false,
    });

    const after = await request(server).get(`/api/orders/${orderId}`).set(auth(ana.token));
    expect(after.body.canReportIncident).toBe(false);
    expect(after.body.incident).toMatchObject({ reason: 'cold', status: 'open' });

    const adminDetail = await request(server).get(`/api/admin/incidents/${response.body.id}`).set(auth(adminToken));
    expect(adminDetail.status).toBe(200);
    expect(adminDetail.body).toMatchObject({
      id: response.body.id,
      orderId,
      reason: 'cold',
      orderCode: expect.stringMatching(/^[A-Z]{3}\d{6}$/),
      customerName: 'Cliente ana',
    });
    expect((await request(server).get('/api/admin/incidents/no-existe').set(auth(adminToken))).status).toBe(404);
  });

  it('es uno por pedido', async () => {
    const orderId = await deliveredOrder(ana);
    expect((await report(ana, orderId, { reason: 'late' })).status).toBe(201);

    const again = await report(ana, orderId, { reason: 'cold' });

    expect(again.status).toBe(409);
    expect(await prisma.incident.count({ where: { orderId } })).toBe(1);
  });

  it('no se reporta el pedido de otro cliente', async () => {
    const orderId = await deliveredOrder(beto);

    const response = await report(ana, orderId, { reason: 'wrong_order' });

    expect(response.status).toBe(404);
    expect(await prisma.incident.count({ where: { orderId } })).toBe(0);
  });

  it('no se reporta un pedido que no se entregó', async () => {
    const pending = await placeOrder(ana);
    const cancelled = await placeOrder(ana);
    await request(server).post(`/api/orders/${cancelled}/cancel`).set(auth(ana.token));

    expect((await report(ana, pending, { reason: 'late' })).status).toBe(409);
    expect((await report(ana, cancelled, { reason: 'late' })).status).toBe(409);

    const detail = await request(server).get(`/api/orders/${pending}`).set(auth(ana.token));
    expect(detail.body.canReportIncident).toBe(false);
    expect(await prisma.incident.count({ where: { orderId: { in: [pending, cancelled] } } })).toBe(0);
  });

  it('valida el motivo y pide el mensaje si el motivo es "otro"', async () => {
    const orderId = await deliveredOrder(ana);

    expect((await report(ana, orderId, { reason: 'explotó' })).status).toBe(400);
    expect((await report(ana, orderId, {})).status).toBe(400);
    expect((await report(ana, orderId, { reason: 'other' })).status).toBe(400);
    expect((await report(ana, orderId, { reason: 'other', message: '   ' })).status).toBe(400);
    expect((await report(ana, orderId, { reason: 'late', message: 'x'.repeat(501) })).status).toBe(400);
    expect(await prisma.incident.count({ where: { orderId } })).toBe(0);

    expect((await report(ana, orderId, { reason: 'other', message: 'Faltó la servilleta' })).status).toBe(201);
  });

  it('sin token responde 401', async () => {
    const response = await request(server).post('/api/orders/cualquiera/incident').send({ reason: 'late' });
    expect(response.status).toBe(401);
  });
});

describe('/api/admin/incidents (HU-36)', () => {
  it('lista las abiertas primero y permite marcarlas resueltas', async () => {
    const first = await deliveredOrder(ana);
    const second = await deliveredOrder(beto);
    const firstIncident = await report(ana, first, { reason: 'missing_item', message: 'Faltaron las papas' });
    expect(firstIncident.status).toBe(201);
    expect((await report(beto, second, { reason: 'late' })).status).toBe(201);

    const resolved = await request(server)
      .patch(`/api/admin/incidents/${firstIncident.body.id}`)
      .set(auth(adminToken))
      .send({ status: 'resolved', response: 'Te reponemos el pedido' });
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({
      status: 'resolved',
      response: 'Te reponemos el pedido',
      coupon: null,
      resolvedAt: expect.any(String),
    });
    const withoutCoupon = await request(server).get('/api/orders').set(auth(ana.token));
    expect(withoutCoupon.body.find((order: { id: string }) => order.id === first)).toMatchObject({
      hasIncident: true,
      claimOpen: true,
    });

    const list = await adminList();
    expect(list.status).toBe(200);
    const ours = list.body.filter((row: { orderId: string }) => [first, second].includes(row.orderId));
    // La abierta (second) va antes que la resuelta (first).
    expect(ours.map((row: { orderId: string }) => row.orderId)).toEqual([second, first]);
    expect(ours[1]).toMatchObject({
      orderId: first,
      orderCode: expect.stringMatching(/^[A-Z]{3}\d{6}$/),
      reason: 'missing_item',
      message: 'Faltaron las papas',
      customerName: 'Cliente ana',
      status: 'resolved',
    });

    const onlyOpen = await adminList({ status: 'open' });
    const openIds = onlyOpen.body.map((row: { orderId: string }) => row.orderId);
    expect(openIds).toContain(second);
    expect(openIds).not.toContain(first);
    expect((await adminList({ status: 'cualquiera' })).status).toBe(400);
  });

  it('se puede reabrir y el id inexistente responde 404', async () => {
    const orderId = await deliveredOrder(ana);
    const created = await report(ana, orderId, { reason: 'cold' });

    const reopened = await request(server)
      .patch(`/api/admin/incidents/${created.body.id}`)
      .set(auth(adminToken))
      .send({ status: 'open' });
    expect(reopened.body).toMatchObject({ status: 'open', resolvedAt: null });

    const missing = await request(server)
      .patch('/api/admin/incidents/no-existe')
      .set(auth(adminToken))
      .send({ status: 'resolved', response: 'Listo' });
    expect(missing.status).toBe(404);

    const withoutResponse = await request(server)
      .patch(`/api/admin/incidents/${created.body.id}`)
      .set(auth(adminToken))
      .send({ status: 'resolved', response: '   ' });
    expect(withoutResponse.status).toBe(400);
  });

  it('la solución con cupón la ve solo ese cliente y se descuenta una vez', async () => {
    const claimedId = await deliveredOrder(ana);
    const created = await report(ana, claimedId, { reason: 'wrong_order', message: 'Llegó otra cosa' });
    expect(created.status).toBe(201);
    const reported = await request(server).get('/api/orders').set(auth(ana.token));
    expect(reported.body.find((order: { id: string }) => order.id === claimedId)).toMatchObject({
      claimOpen: true,
    });

    const activePromos = await prisma.promotion.findMany({ where: { active: true }, select: { id: true } });
    const loyalty = await prisma.parameter.findUnique({ where: { key: 'loyalty_campaign_active' } });
    await prisma.promotion.updateMany({ where: { active: true }, data: { active: false } });
    await prisma.parameter.upsert({
      where: { key: 'loyalty_campaign_active' },
      update: { value: 'false' },
      create: { key: 'loyalty_campaign_active', value: 'false' },
    });

    try {
      const resolved = await request(server)
        .patch(`/api/admin/incidents/${created.body.id}`)
        .set(auth(adminToken))
        .send({ status: 'resolved', response: 'Te dejamos un cupón de $800', couponAmount: 800 });
      expect(resolved.status).toBe(200);
      const code = resolved.body.coupon.code as string;
      expect(code).toMatch(/^REC-[A-Z2-9]{6}$/);
      expect(resolved.body.coupon).toMatchObject({ amount: 800, used: false, status: 'available' });
      const stackPromo = await prisma.promotion.create({
        data: { name: `E2E suma reclamo ${stamp}`, type: 'percent', value: 10, active: true },
      });
      const stackedQuote = await request(server)
        .post('/api/promotions/quote')
        .set(auth(ana.token))
        .send({ items: [{ productId: drink.id, quantity: 1 }] });
      expect(stackedQuote.status).toBe(200);
      expect(stackedQuote.body.discountAmount).toBe(950);
      expect(stackedQuote.body.offers.filter((offer: { applied: boolean }) => offer.applied)).toHaveLength(2);
      await prisma.promotion.delete({ where: { id: stackPromo.id } });
      const createdAt = new Date(resolved.body.coupon.createdAt as string);
      const expiresAt = new Date(resolved.body.coupon.expiresAt as string);
      const days = (expiresAt.getTime() - createdAt.getTime()) / 86_400_000;
      expect(days).toBeGreaterThan(85);
      expect(days).toBeLessThan(95);

      const coupons = await request(server).get('/api/admin/incidents/coupons').set(auth(adminToken));
      expect(coupons.status).toBe(200);
      expect(coupons.body.find((row: { code: string }) => row.code === code)).toMatchObject({
        orderCode: expect.stringMatching(/^[A-Z]{3}\d{6}$/),
        status: 'available',
        reportedAt: expect.any(String),
        createdAt: resolved.body.coupon.createdAt,
      });

      const stale = new Date(createdAt);
      stale.setMonth(stale.getMonth() - 4);
      await prisma.incident.update({ where: { id: created.body.id }, data: { couponCreatedAt: stale } });
      const expiredQuote = await request(server)
        .post('/api/promotions/quote')
        .set(auth(ana.token))
        .send({ items: [{ productId: drink.id, quantity: 1 }] });
      expect(JSON.stringify(expiredQuote.body)).not.toContain(code);
      const expiredList = await request(server).get('/api/admin/incidents/coupons').set(auth(adminToken));
      expect(expiredList.body.find((row: { code: string }) => row.code === code)).toMatchObject({ status: 'expired' });
      const expiredOrders = await request(server).get('/api/orders').set(auth(ana.token));
      expect(expiredOrders.body.find((order: { id: string }) => order.id === claimedId)).toMatchObject({
        claimOpen: true,
      });
      await prisma.incident.update({ where: { id: created.body.id }, data: { couponCreatedAt: createdAt } });

      const detail = await request(server).get(`/api/orders/${claimedId}`).set(auth(ana.token));
      expect(detail.body.incident).toMatchObject({
        status: 'resolved',
        response: 'Te dejamos un cupón de $800',
        coupon: { code, amount: 800, used: false },
      });

      const list = await request(server).get('/api/orders').set(auth(ana.token));
      expect(list.body.find((order: { id: string }) => order.id === claimedId)).toMatchObject({
        hasIncident: true,
        hasResolution: true,
        resolutionUnseen: true,
        claimOpen: true,
      });
      const seen = await request(server).post(`/api/orders/${claimedId}/incident/seen`).set(auth(ana.token));
      expect(seen.status).toBe(201);
      expect(seen.body.responseUnseen).toBe(false);
      const hidden = await request(server).post(`/api/orders/${claimedId}/incident/seen`).set(auth(beto.token));
      expect(hidden.status).toBe(404);
      const afterSeen = await request(server).get('/api/orders').set(auth(ana.token));
      expect(afterSeen.body.find((order: { id: string }) => order.id === claimedId)).toMatchObject({
        hasIncident: true,
        resolutionUnseen: false,
      });

      const edited = await request(server)
        .patch(`/api/admin/incidents/${created.body.id}`)
        .set(auth(adminToken))
        .send({ status: 'resolved', response: 'Corregimos el cupón', couponAmount: 900 });
      expect(edited.status).toBe(200);
      expect(edited.body).toMatchObject({
        response: 'Corregimos el cupón',
        responseUnseen: true,
        coupon: { code, amount: 900, used: false },
      });
      const unread = await request(server).get('/api/orders').set(auth(ana.token));
      expect(unread.body.find((order: { id: string }) => order.id === claimedId)).toMatchObject({
        resolutionUnseen: true,
      });
      const restoredResponse = await request(server)
        .patch(`/api/admin/incidents/${created.body.id}`)
        .set(auth(adminToken))
        .send({ status: 'resolved', response: 'Te dejamos un cupón de $800', couponAmount: 800 });
      expect(restoredResponse.status).toBe(200);
      expect(restoredResponse.body.coupon).toMatchObject({ code, amount: 800 });

      const quote = await request(server)
        .post('/api/promotions/quote')
        .set(auth(ana.token))
        .send({ items: [{ productId: drink.id, quantity: 1 }] });
      expect(quote.status).toBe(200);
      expect(quote.body.promotion).toMatchObject({ name: `Cupón ${code}` });
      expect(quote.body.discountAmount).toBe(800);

      const other = await request(server)
        .post('/api/promotions/quote')
        .set(auth(beto.token))
        .send({ items: [{ productId: drink.id, quantity: 1 }] });
      expect(JSON.stringify(other.body)).not.toContain(code);

      const redeemedId = await placeOrder(ana);
      const redeemed = await request(server).get(`/api/orders/${redeemedId}`).set(auth(ana.token));
      expect(redeemed.body).toMatchObject({ promotionName: `Cupón ${code}`, discountAmount: 800 });

      const used = await request(server).get(`/api/orders/${claimedId}`).set(auth(ana.token));
      expect(used.body.incident.coupon.used).toBe(true);
      const closed = await request(server).get('/api/orders').set(auth(ana.token));
      expect(closed.body.find((order: { id: string }) => order.id === claimedId)).toMatchObject({
        hasIncident: true,
        claimOpen: false,
      });
      expect(closed.body.find((order: { id: string }) => order.id === redeemedId)).toMatchObject({
        claimOpen: false,
      });

      const locked = await request(server)
        .patch(`/api/admin/incidents/${created.body.id}`)
        .set(auth(adminToken))
        .send({ status: 'resolved', response: 'Otro monto', couponAmount: 100 });
      expect(locked.status).toBe(409);
      const reopened = await request(server)
        .patch(`/api/admin/incidents/${created.body.id}`)
        .set(auth(adminToken))
        .send({ status: 'open' });
      expect(reopened.status).toBe(409);

      const cancelled = await request(server).post(`/api/orders/${redeemedId}/cancel`).set(auth(ana.token));
      expect(cancelled.status).toBe(200);
      const restored = await request(server).get(`/api/orders/${claimedId}`).set(auth(ana.token));
      expect(restored.body.incident.coupon.used).toBe(false);
      const reopenedList = await request(server).get('/api/orders').set(auth(ana.token));
      expect(reopenedList.body.find((order: { id: string }) => order.id === claimedId)).toMatchObject({
        claimOpen: true,
      });
    } finally {
      await prisma.promotion.deleteMany({ where: { name: `E2E suma reclamo ${stamp}` } });
      if (activePromos.length > 0) {
        await prisma.promotion.updateMany({
          where: { id: { in: activePromos.map((promo) => promo.id) } },
          data: { active: true },
        });
      }
      if (loyalty) {
        await prisma.parameter.update({ where: { key: loyalty.key }, data: { value: loyalty.value } });
      } else {
        await prisma.parameter.deleteMany({ where: { key: 'loyalty_campaign_active' } });
      }
    }
  });

  it('con varios cupones se elige uno, y por defecto el que vence antes', async () => {
    const soonOrderId = await deliveredOrder(beto);
    const laterOrderId = await deliveredOrder(beto);
    const soonReport = await report(beto, soonOrderId, { reason: 'cold', message: 'Frío' });
    const laterReport = await report(beto, laterOrderId, { reason: 'missing_item', message: 'Faltó algo' });
    expect(soonReport.status).toBe(201);
    expect(laterReport.status).toBe(201);

    const soonResolved = await request(server)
      .patch(`/api/admin/incidents/${soonReport.body.id}`)
      .set(auth(adminToken))
      .send({ status: 'resolved', response: 'Cupón chico que vence antes', couponAmount: 200 });
    const laterResolved = await request(server)
      .patch(`/api/admin/incidents/${laterReport.body.id}`)
      .set(auth(adminToken))
      .send({ status: 'resolved', response: 'Cupón grande que vence después', couponAmount: 700 });
    expect(soonResolved.status).toBe(200);
    expect(laterResolved.status).toBe(200);
    const soonCode = soonResolved.body.coupon.code as string;
    const laterCode = laterResolved.body.coupon.code as string;

    const sooner = new Date();
    sooner.setDate(sooner.getDate() - 10);
    await prisma.incident.update({ where: { id: soonReport.body.id }, data: { couponCreatedAt: sooner } });

    const activePromos = await prisma.promotion.findMany({ where: { active: true }, select: { id: true } });
    const loyalty = await prisma.parameter.findUnique({ where: { key: 'loyalty_campaign_active' } });
    await prisma.promotion.updateMany({ where: { active: true }, data: { active: false } });
    await prisma.parameter.upsert({
      where: { key: 'loyalty_campaign_active' },
      update: { value: 'false' },
      create: { key: 'loyalty_campaign_active', value: 'false' },
    });

    try {
      const quote = await request(server)
        .post('/api/promotions/quote')
        .set(auth(beto.token))
        .send({ items: [{ productId: drink.id, quantity: 1 }] });
      expect(quote.status).toBe(200);
      const coupons = (quote.body.offers as { name: string; applied: boolean; stacks?: boolean }[]).filter(
        (offer) => offer.stacks,
      );
      expect(coupons).toHaveLength(2);
      expect(coupons.filter((offer) => offer.applied)).toEqual([
        expect.objectContaining({ name: `Cupón ${soonCode}` }),
      ]);
      expect(quote.body.discountAmount).toBe(200);

      const chosen = await request(server)
        .post('/api/promotions/quote')
        .set(auth(beto.token))
        .send({ items: [{ productId: drink.id, quantity: 1 }], couponIncidentId: laterReport.body.id });
      expect(chosen.status).toBe(200);
      expect(chosen.body.discountAmount).toBe(700);
      const chosenCoupons = (chosen.body.offers as { name: string; applied: boolean; stacks?: boolean }[]).filter(
        (offer) => offer.stacks,
      );
      expect(chosenCoupons).toHaveLength(2);
      expect(chosenCoupons.find((offer) => offer.applied)?.name).toBe(`Cupón ${laterCode}`);

      const added = await request(server)
        .post('/api/cart/items')
        .set(auth(beto.token))
        .send({ productId: drink.id, quantity: 1 });
      expect(added.status).toBe(201);
      const order = await request(server)
        .post('/api/orders')
        .set(auth(beto.token))
        .send({
          fulfillment: 'delivery',
          branchId,
          addressId: beto.addressId,
          couponIncidentId: laterReport.body.id,
        });
      expect(order.status).toBe(201);
      expect(order.body).toMatchObject({ promotionName: `Cupón ${laterCode}`, discountAmount: 700 });

      const soonDetail = await request(server).get(`/api/orders/${soonOrderId}`).set(auth(beto.token));
      const laterDetail = await request(server).get(`/api/orders/${laterOrderId}`).set(auth(beto.token));
      expect(soonDetail.body.incident.coupon.used).toBe(false);
      expect(laterDetail.body.incident.coupon.used).toBe(true);
    } finally {
      if (activePromos.length > 0) {
        await prisma.promotion.updateMany({
          where: { id: { in: activePromos.map((promo) => promo.id) } },
          data: { active: true },
        });
      }
      if (loyalty) {
        await prisma.parameter.update({ where: { key: loyalty.key }, data: { value: loyalty.value } });
      } else {
        await prisma.parameter.deleteMany({ where: { key: 'loyalty_campaign_active' } });
      }
    }
  });

  it('un cliente no entra, y sin token responde 401', async () => {
    expect((await request(server).get('/api/admin/incidents').set(auth(ana.token))).status).toBe(403);
    expect(
      (await request(server).patch('/api/admin/incidents/x').set(auth(ana.token)).send({ status: 'resolved' })).status,
    ).toBe(403);
    expect((await request(server).get('/api/admin/incidents')).status).toBe(401);
  });
});