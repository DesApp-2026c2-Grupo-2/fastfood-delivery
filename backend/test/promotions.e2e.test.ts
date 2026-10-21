import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { discountFor } from '../src/promotions/promotions.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

const stamp = Date.now();
const DAY_MS = 24 * 60 * 60_000;

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;

let adminToken: string;
let ana: { token: string; userId: string };
let branch: { id: string };
let burger: { id: string; name: string };
let bacon: { id: string; name: string };
// Promos que ya estaban activas en la base: se apagan durante la suite y se vuelven a prender al final.
let preexistingActive: string[] = [];
const createdPromotionIds: string[] = [];

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function createPromotion(body: object) {
  const response = await request(server).post('/api/admin/promotions').set(auth(adminToken)).send(body);
  expect(response.status).toBe(201);
  createdPromotionIds.push(response.body.id);
  return response.body as { id: string; name: string; value: number; active: boolean };
}

async function fillCart(lines: object[]) {
  for (const line of lines) {
    const added = await request(server).post('/api/cart/items').set(auth(ana.token)).send(line);
    expect(added.status).toBe(201);
  }
}

const placePickup = () =>
  request(server).post('/api/orders').set(auth(ana.token)).send({ fulfillment: 'pickup', branchId: branch.id });

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

  const active = await prisma.promotion.findMany({ where: { active: true }, select: { id: true } });
  preexistingActive = active.map((promotion) => promotion.id);
  await prisma.promotion.updateMany({ where: { id: { in: preexistingActive } }, data: { active: false } });

  const hamburguesas = await prisma.category.upsert({
    where: { slug: 'hamburguesas' },
    update: {},
    create: { name: 'Hamburguesas', slug: 'hamburguesas' },
  });
  const adicional = await prisma.category.upsert({
    where: { slug: 'adicional' },
    update: {},
    create: { name: 'Adicional', slug: 'adicional' },
  });
  burger = await prisma.product.create({
    data: {
      name: `E2E Promo Hamburguesa ${stamp}`,
      slug: `e2e-promo-hamburguesa-${stamp}`,
      description: 'Producto de prueba',
      price: new Prisma.Decimal('10000.00'),
      categories: { connect: { id: hamburguesas.id } },
    },
    select: { id: true, name: true },
  });
  bacon = await prisma.product.create({
    data: {
      name: `E2E Promo Bacon ${stamp}`,
      slug: `e2e-promo-bacon-${stamp}`,
      description: 'Producto de prueba',
      price: new Prisma.Decimal('1500.00'),
      categories: { connect: { id: adicional.id } },
    },
    select: { id: true, name: true },
  });
  branch = await prisma.branch.create({
    data: {
      name: `Sucursal E2E Promo ${stamp}`,
      address: 'Av. San Martín 100, Mendoza',
      latitude: -32.8895,
      longitude: -68.8458,
      openingHours: 'Lun-Dom 11:00-23:30',
      phone: '+54 261 400-0000',
    },
    select: { id: true },
  });
  for (const product of [burger, bacon]) {
    await prisma.stock.create({ data: { branchId: branch.id, productId: product.id, available: 100 } });
  }

  const login = await request(server).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(login.status).toBe(201);
  adminToken = login.body.accessToken;

  const register = await request(server)
    .post('/api/auth/register')
    .send({ email: `promotions.e2e.ana.${stamp}@rapido.local`, name: 'Cliente Ana', password: 'Cliente123!' });
  expect(register.status).toBe(201);
  ana = { token: register.body.accessToken, userId: register.body.user.id };
}, 60_000);

beforeEach(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { userId: ana.userId } } });
  // Cada test arranca sin promos vigentes: las suyas las crea él.
  await prisma.promotion.updateMany({ where: { id: { in: createdPromotionIds } }, data: { active: false } });
});

afterAll(async () => {
  if (branch) {
    const orders = await prisma.order.findMany({ where: { branchId: branch.id }, select: { id: true, userId: true, addressId: true } });
    await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
    const guestAddressIds = orders.flatMap((order) => (!order.userId && order.addressId ? [order.addressId] : []));
    await prisma.address.deleteMany({ where: { id: { in: guestAddressIds } } });
  }
  await prisma.promotion.deleteMany({ where: { id: { in: createdPromotionIds } } });
  await prisma.promotion.updateMany({ where: { id: { in: preexistingActive } }, data: { active: true } });
  if (ana) {
    await prisma.user.deleteMany({ where: { id: ana.userId } });
  }
  await prisma.product.deleteMany({ where: { id: { in: [burger, bacon].filter(Boolean).map((product) => product.id) } } });
  if (branch) {
    await prisma.branch.deleteMany({ where: { id: branch.id } });
  }
  await app.close();
});

describe('descuento porcentual', () => {
  it('redondea a dos decimales y nunca pasa el subtotal', () => {
    expect(discountFor({ type: 'percent', value: 10 }, 20000)).toBe(2000);
    // 999,99 × 15 % = 149,9985 → 150,00
    expect(discountFor({ type: 'percent', value: 15 }, 999.99)).toBe(150);
    expect(discountFor({ type: 'percent', value: 100 }, 1234.56)).toBe(1234.56);
    expect(discountFor({ type: 'percent', value: 10, minSubtotal: 20000 }, 19999.99)).toBe(0);
    expect(discountFor({ type: 'percent', value: 10, minSubtotal: 20000 }, 20000)).toBe(2000);
  });

  it('el 2x1 regala una unidad cada dos y no descuenta los adicionales', () => {
    const lines = [
      { productId: 'burger', quantity: 1, unitPrice: 10000 },
      { productId: 'burger', quantity: 1, unitPrice: 10000 },
    ];
    expect(discountFor({ type: 'two_for_one', value: 0, productId: 'burger' }, 21500, lines)).toBe(10000);
    expect(discountFor({ type: 'two_for_one', value: 0, productId: 'burger' }, 10000, [lines[0]])).toBe(0);
    expect(
      discountFor(
        { type: 'two_for_one', value: 0, productId: 'burger' },
        30000,
        [{ productId: 'burger', quantity: 5, unitPrice: 10000 }],
      ),
    ).toBe(20000);
  });
});

describe('ABM de promociones (HU-20)', () => {
  it('el admin da de alta, ve, edita y desactiva una promo porcentual', async () => {
    const created = await createPromotion({ name: `  Promo E2E alta ${stamp}  `, value: 10 });
    expect(created).toMatchObject({ name: `Promo E2E alta ${stamp}`, type: 'percent', value: 10, active: true });

    const list = await request(server).get('/api/admin/promotions').set(auth(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.map((promotion: { id: string }) => promotion.id)).toContain(created.id);

    const edited = await request(server)
      .patch(`/api/admin/promotions/${created.id}`)
      .set(auth(adminToken))
      .send({ value: 25, active: false });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ value: 25, active: false });

    const detail = await request(server).get(`/api/admin/promotions/${created.id}`).set(auth(adminToken));
    expect(detail.body).toMatchObject({ value: 25, active: false });
  });

  it('valida el porcentaje (1 a 100, entero), el nombre y que el inicio no pase al fin', async () => {
    const post = (body: object) => request(server).post('/api/admin/promotions').set(auth(adminToken)).send(body);

    expect((await post({ name: 'Promo E2E', value: 0 })).status).toBe(400);
    expect((await post({ name: 'Promo E2E', value: 101 })).status).toBe(400);
    expect((await post({ name: 'Promo E2E', value: 12.5 })).status).toBe(400);
    expect((await post({ name: '   ', value: 10 })).status).toBe(400);
    expect((await post({ name: 'Promo E2E', value: 10, type: 'two_for_one' })).status).toBe(400);
    expect((await post({ name: 'Promo E2E', type: 'two_for_one', productId: 'no-existe' })).status).toBe(400);
    const badRange = await post({
      name: 'Promo E2E',
      value: 10,
      startsAt: new Date(Date.now() + DAY_MS).toISOString(),
      endsAt: new Date().toISOString(),
    });
    expect(badRange.status).toBe(400);
  });

  it('un cliente no accede al API de promociones', async () => {
    expect((await request(server).get('/api/admin/promotions').set(auth(ana.token))).status).toBe(403);
    expect(
      (await request(server).post('/api/admin/promotions').set(auth(ana.token)).send({ name: 'x', value: 10 })).status,
    ).toBe(403);
  });

  it('borra una promo sin pedidos; una usada responde 409 y sigue existiendo', async () => {
    const unused = await createPromotion({ name: `Promo E2E sin usar ${stamp}`, value: 5, active: false });
    const removed = await request(server).delete(`/api/admin/promotions/${unused.id}`).set(auth(adminToken));
    expect(removed.status).toBe(200);
    expect(await prisma.promotion.count({ where: { id: unused.id } })).toBe(0);

    const used = await createPromotion({ name: `Promo E2E usada ${stamp}`, value: 10 });
    await fillCart([{ productId: burger.id, quantity: 1 }]);
    expect((await placePickup()).status).toBe(201);

    const conflict = await request(server).delete(`/api/admin/promotions/${used.id}`).set(auth(adminToken));
    expect(conflict.status).toBe(409);
    expect(await prisma.promotion.count({ where: { id: used.id } })).toBe(1);
  });
});

describe('promo porcentual automática al confirmar (HU-21)', () => {
  it('se aplica al pedido con sesión y guarda subtotal, descuento, nombre y total', async () => {
    const promo = await createPromotion({ name: `Promo E2E 10 ${stamp}`, value: 10 });
    // (10000 + 1500) × 2 = 23000
    await fillCart([{ productId: burger.id, quantity: 2, extraIds: [bacon.id] }]);

    const response = await placePickup();

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      subtotal: 23000,
      discountAmount: 2300,
      totalAmount: 20700,
      promotionName: promo.name,
    });
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(stored.promotionId).toBe(promo.id);
    expect(Number(stored.subtotal)).toBe(23000);
    expect(Number(stored.discountAmount)).toBe(2300);
    expect(Number(stored.totalAmount)).toBe(20700);

    const mine = await request(server).get(`/api/orders/${response.body.id}`).set(auth(ana.token));
    expect(mine.body).toMatchObject({ subtotal: 23000, discountAmount: 2300, totalAmount: 20700, promotionName: promo.name });
    const history = await request(server).get('/api/orders').set(auth(ana.token));
    expect(history.body.find((order: { id: string }) => order.id === response.body.id)).toMatchObject({
      discountAmount: 2300,
      promotionName: promo.name,
    });
    const admin = await request(server).get(`/api/admin/orders/${response.body.id}`).set(auth(adminToken));
    expect(admin.body).toMatchObject({ subtotal: 23000, discountAmount: 2300, totalAmount: 20700, promotionName: promo.name });
  });

  it('el invitado recibe la misma promo', async () => {
    const promo = await createPromotion({ name: `Promo E2E invitado ${stamp}`, value: 20 });

    const response = await request(server)
      .post('/api/orders/guest')
      .send({
        name: 'Invitado E2E',
        email: `promotions.e2e.guest.${stamp}@rapido.local`,
        fulfillment: 'pickup',
        branchId: branch.id,
        items: [{ productId: burger.id, quantity: 1 }],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      subtotal: 10000,
      discountAmount: 2000,
      totalAmount: 8000,
      promotionName: promo.name,
    });
  });

  it('sin promo vigente el total es el subtotal: vencida, futura o inactiva no aplican', async () => {
    await createPromotion({
      name: `Promo E2E vencida ${stamp}`,
      value: 30,
      startsAt: new Date(Date.now() - 10 * DAY_MS).toISOString(),
      endsAt: new Date(Date.now() - DAY_MS).toISOString(),
    });
    await createPromotion({
      name: `Promo E2E futura ${stamp}`,
      value: 30,
      startsAt: new Date(Date.now() + DAY_MS).toISOString(),
    });
    await createPromotion({ name: `Promo E2E inactiva ${stamp}`, value: 30, active: false });
    await fillCart([{ productId: burger.id, quantity: 1 }]);

    const response = await placePickup();

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      subtotal: 10000,
      discountAmount: 0,
      totalAmount: 10000,
      promotionName: null,
    });
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(stored.promotionId).toBeNull();
  });

  it('con dos vigentes gana la que más descuenta; si empatan, la más nueva', async () => {
    await createPromotion({ name: `Promo E2E 10 chica ${stamp}`, value: 10 });
    const bigger = await createPromotion({ name: `Promo E2E 15 ${stamp}`, value: 15 });
    await fillCart([{ productId: burger.id, quantity: 1 }]);

    const first = await placePickup();
    expect(first.body).toMatchObject({ discountAmount: 1500, promotionName: bigger.name });

    const newer = await createPromotion({ name: `Promo E2E 15 nueva ${stamp}`, value: 15 });
    await fillCart([{ productId: burger.id, quantity: 1 }]);
    const second = await placePickup();
    expect(second.body).toMatchObject({ discountAmount: 1500, promotionName: newer.name });
  });

  it('editar o desactivar la promo después no cambia el pedido ya creado', async () => {
    const promo = await createPromotion({ name: `Promo E2E original ${stamp}`, value: 10 });
    await fillCart([{ productId: burger.id, quantity: 1 }]);
    const created = await placePickup();
    expect(created.body.totalAmount).toBe(9000);

    await request(server)
      .patch(`/api/admin/promotions/${promo.id}`)
      .set(auth(adminToken))
      .send({ name: 'Otro nombre', value: 50, active: false });

    const mine = await request(server).get(`/api/orders/${created.body.id}`).set(auth(ana.token));
    expect(mine.body).toMatchObject({
      subtotal: 10000,
      discountAmount: 1000,
      totalAmount: 9000,
      promotionName: promo.name,
    });
  });
});

describe('promo 2x1 de un producto (HU-20, HU-21)', () => {
  it('el admin la da de alta con el producto y se ve en el listado', async () => {
    const created = await createPromotion({
      name: `Promo E2E 2x1 ${stamp}`,
      type: 'two_for_one',
      productId: burger.id,
    });
    expect(created).toMatchObject({
      type: 'two_for_one',
      value: 0,
      productId: burger.id,
      productName: burger.name,
      active: true,
    });

    const marked = await request(server).get(`/api/products/${burger.id}`);
    expect(marked.status).toBe(200);
    expect(marked.body.twoForOne).toBe(true);
    const other = await request(server).get(`/api/products/${bacon.id}`);
    expect(other.body.twoForOne).toBe(false);
  });

  it('con dos unidades regala una, cobra los adicionales y reserva las dos', async () => {
    const promo = await createPromotion({
      name: `Promo E2E 2x1 pedido ${stamp}`,
      type: 'two_for_one',
      productId: burger.id,
    });
    const before = await prisma.stock.findUniqueOrThrow({
      where: { branchId_productId: { branchId: branch.id, productId: burger.id } },
    });
    // (10000 + 1500) × 2 = 23000. El 2x1 descuenta una hamburguesa, no el bacon.
    await fillCart([{ productId: burger.id, quantity: 2, extraIds: [bacon.id] }]);

    const response = await placePickup();

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      subtotal: 23000,
      discountAmount: 10000,
      totalAmount: 13000,
      promotionName: promo.name,
    });
    const after = await prisma.stock.findUniqueOrThrow({
      where: { branchId_productId: { branchId: branch.id, productId: burger.id } },
    });
    expect(after.available).toBe(before.available - 2);
  });

  it('suma las cantidades de varias líneas y con una sola unidad no descuenta', async () => {
    await createPromotion({
      name: `Promo E2E 2x1 lineas ${stamp}`,
      type: 'two_for_one',
      productId: burger.id,
    });
    await fillCart([
      { productId: burger.id, quantity: 1, extraIds: [bacon.id] },
      { productId: burger.id, quantity: 1 },
    ]);
    const paired = await placePickup();
    expect(paired.body).toMatchObject({ subtotal: 21500, discountAmount: 10000, totalAmount: 11500 });

    await fillCart([{ productId: burger.id, quantity: 1 }]);
    const single = await placePickup();
    expect(single.body).toMatchObject({ subtotal: 10000, discountAmount: 0, totalAmount: 10000, promotionName: null });
  });

  it('si un porcentual descuenta más, gana el porcentual', async () => {
    await createPromotion({
      name: `Promo E2E 2x1 pierde ${stamp}`,
      type: 'two_for_one',
      productId: burger.id,
    });
    const percent = await createPromotion({ name: `Promo E2E 90 ${stamp}`, value: 90 });
    await fillCart([{ productId: burger.id, quantity: 2 }]);

    const response = await placePickup();

    expect(response.body).toMatchObject({
      subtotal: 20000,
      discountAmount: 18000,
      totalAmount: 2000,
      promotionName: percent.name,
    });
  });

  it('la cotización usa la misma regla', async () => {
    const promo = await createPromotion({
      name: `Promo E2E 2x1 cotiza ${stamp}`,
      type: 'two_for_one',
      productId: burger.id,
    });
    await fillCart([{ productId: burger.id, quantity: 2 }]);

    const response = await request(server).post('/api/promotions/quote').set(auth(ana.token)).send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      subtotal: 20000,
      discountAmount: 10000,
      totalAmount: 10000,
      promotion: { id: promo.id, name: promo.name, type: 'two_for_one', value: 0 },
    });
  });
});

describe('POST /api/promotions/quote', () => {
  it('con sesión cotiza el carrito con la misma regla que el pedido', async () => {
    const promo = await createPromotion({ name: `Promo E2E cotiza ${stamp}`, value: 10 });
    await fillCart([{ productId: burger.id, quantity: 1, extraIds: [bacon.id] }]);

    const response = await request(server).post('/api/promotions/quote').set(auth(ana.token)).send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      subtotal: 11500,
      discountAmount: 1150,
      totalAmount: 10350,
      promotion: { id: promo.id, name: promo.name, type: 'percent', value: 10 },
    });
  });

  it('el invitado cotiza los ítems que manda; sin promo vigente, promotion es null', async () => {
    const response = await request(server)
      .post('/api/promotions/quote')
      .send({ items: [{ productId: burger.id, quantity: 3 }] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ subtotal: 30000, discountAmount: 0, totalAmount: 30000, promotion: null });
  });

  it('sin sesión y sin ítems, o con el carrito vacío, responde 400', async () => {
    expect((await request(server).post('/api/promotions/quote').send({})).status).toBe(400);
    expect((await request(server).post('/api/promotions/quote').set(auth(ana.token)).send({})).status).toBe(400);
  });
});

describe('porcentual con monto mínimo', () => {
  it('no descuenta por debajo del mínimo y el banner publica ese monto', async () => {
    const promo = await createPromotion({
      name: `Promo E2E minimo ${stamp}`,
      value: 10,
      minSubtotal: 20000,
      startsAt: new Date(Date.now() - DAY_MS).toISOString(),
      endsAt: new Date(Date.now() + DAY_MS).toISOString(),
    });

    const below = await request(server)
      .post('/api/promotions/quote')
      .send({ items: [{ productId: burger.id, quantity: 1 }] });
    expect(below.status).toBe(200);
    expect(below.body).toMatchObject({ subtotal: 10000, discountAmount: 0, promotion: null });

    const enough = await request(server)
      .post('/api/promotions/quote')
      .send({ items: [{ productId: burger.id, quantity: 2 }] });
    expect(enough.status).toBe(200);
    expect(enough.body).toMatchObject({
      subtotal: 20000,
      discountAmount: 2000,
      totalAmount: 18000,
      promotion: { id: promo.id, type: 'percent', value: 10 },
    });

    const banner = await request(server).get('/api/promotions/banner');
    expect(banner.status).toBe(200);
    expect(banner.body.offer).toMatchObject({ id: promo.id, value: 10, minSubtotal: 20000 });

    await request(server).delete(`/api/admin/promotions/${promo.id}`).set(auth(adminToken));
  });
});
