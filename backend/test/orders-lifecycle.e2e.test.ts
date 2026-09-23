import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { OrderStatus, Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

const stamp = Date.now();

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;

type Customer = { token: string; userId: string; addressId: string };

let adminToken: string;
let ana: Customer;
let beto: Customer;
let createdBranchId: string | undefined;
let otherCategoryId: string;
let burger: { id: string; name: string };
let bacon: { id: string; name: string };
let drink: { id: string; name: string };

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function createProduct(name: string, price: string, categoryId: string) {
  return prisma.product.create({
    data: {
      name: `${name} ${stamp}`,
      slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${stamp}`,
      description: 'Producto de prueba',
      price: new Prisma.Decimal(price),
      categories: { connect: { id: categoryId } },
    },
    select: { id: true, name: true },
  });
}

async function registerCustomer(alias: string): Promise<Customer> {
  const register = await request(server)
    .post('/api/auth/register')
    .send({ email: `orders.e2e.${alias}.${stamp}@rapido.local`, name: `Cliente ${alias}`, password: 'Cliente123!' });
  expect(register.status).toBe(201);
  const token: string = register.body.accessToken;

  const address = await request(server)
    .post('/api/me/addresses')
    .set(auth(token))
    .send({ street: 'Av. Rivadavia 5000, CABA', latitude: -34.61, longitude: -58.42, isDefault: true });
  expect(address.status).toBe(201);

  return { token, userId: register.body.user.id, addressId: address.body.id };
}

async function placeOrder(customer: Customer, lines: object[] = [{ productId: drink.id, quantity: 1 }]) {
  for (const line of lines) {
    const added = await request(server).post('/api/cart/items').set(auth(customer.token)).send(line);
    expect(added.status).toBe(201);
  }
  const order = await request(server)
    .post('/api/orders')
    .set(auth(customer.token))
    .send({ addressId: customer.addressId });
  expect(order.status).toBe(201);
  return order.body.id as string;
}

function adminSetStatus(orderId: string, status: OrderStatus) {
  return request(server)
    .post(`/api/admin/orders/${orderId}/status`)
    .set(auth(adminToken))
    .send({ status });
}

async function advanceTo(orderId: string, statuses: OrderStatus[]) {
  for (const status of statuses) {
    const response = await adminSetStatus(orderId, status);
    expect(response.status).toBe(201);
  }
}

function currentStatus(orderId: string) {
  return prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
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

  // Las categorías reales (las del seed) se reutilizan y no se borran al terminar.
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
  const other = await prisma.category.create({
    data: { name: `E2E Pedidos Otros ${stamp}`, slug: `e2e-pedidos-otros-${stamp}` },
  });
  otherCategoryId = other.id;

  burger = await createProduct('E2E Pedidos Hamburguesa', '20000.00', hamburguesas.id);
  bacon = await createProduct('E2E Pedidos Bacon', '2000.00', adicional.id);
  drink = await createProduct('E2E Pedidos Gaseosa', '1500.00', other.id);

  let branch = await prisma.branch.findFirst({ where: { active: true } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: `Sucursal E2E Pedidos ${stamp}`,
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

  const login = await request(server)
    .post('/api/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(login.status).toBe(201);
  adminToken = login.body.accessToken;

  ana = await registerCustomer('ana');
  beto = await registerCustomer('beto');
}, 60_000);

beforeEach(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [ana.userId, beto.userId] } } } });
  await prisma.product.updateMany({
    where: { id: { in: [burger.id, bacon.id, drink.id] } },
    data: { available: true },
  });
});

afterAll(async () => {
  const userIds = [ana, beto].filter(Boolean).map((customer) => customer.userId);
  await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.product.deleteMany({ where: { id: { in: [burger, bacon, drink].map((product) => product.id) } } });
  await prisma.category.deleteMany({ where: { id: otherCategoryId } });
  if (createdBranchId) {
    await prisma.branch.deleteMany({ where: { id: createdBranchId } });
  }
  await app.close();
});

describe('GET /api/orders', () => {
  it('lista solo mis pedidos, del más reciente al más viejo', async () => {
    const first = await placeOrder(ana);
    const second = await placeOrder(ana);
    const fromBeto = await placeOrder(beto);

    const response = await request(server).get('/api/orders').set(auth(ana.token));

    expect(response.status).toBe(200);
    const ids = response.body.map((order: { id: string }) => order.id);
    expect(ids).not.toContain(fromBeto);
    expect(ids.indexOf(second)).toBeLessThan(ids.indexOf(first));
    expect(response.body.find((order: { id: string }) => order.id === first)).toEqual({
      id: first,
      status: 'pending',
      totalAmount: 1500,
      createdAt: expect.any(String),
      branch: { id: expect.any(String), name: expect.any(String) },
      itemCount: 1,
    });
  });

  it('sin token responde 401', async () => {
    const response = await request(server).get('/api/orders');
    expect(response.status).toBe(401);
  });
});

describe('GET /api/orders/:id', () => {
  it('trae el detalle con sucursal, timeline y ETA', async () => {
    const orderId = await placeOrder(ana, [{ productId: drink.id, quantity: 2, notes: 'bien fría' }]);

    const response = await request(server).get(`/api/orders/${orderId}`).set(auth(ana.token));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: orderId,
      status: 'pending',
      totalAmount: 3000,
      branch: { id: expect.any(String), name: expect.any(String), address: expect.any(String) },
      address: { street: 'Av. Rivadavia 5000, CABA' },
      canCancel: true,
    });
    expect(response.body.items).toEqual([
      expect.objectContaining({ productId: drink.id, quantity: 2, notes: 'bien fría', subtotal: 3000 }),
    ]);
    // 15 min de base + 3 por ítem + el traslado.
    expect(response.body.etaMinutes).toBeGreaterThanOrEqual(15 + 2 * 3);
    expect(response.body.history).toEqual([
      { id: expect.any(String), status: 'pending', changedAt: expect.any(String) },
    ]);
  });

  it('el pedido de otro cliente responde 404, igual que uno inexistente', async () => {
    const orderId = await placeOrder(beto);

    const other = await request(server).get(`/api/orders/${orderId}`).set(auth(ana.token));
    const missing = await request(server).get('/api/orders/no-existe').set(auth(ana.token));

    expect(other.status).toBe(404);
    expect(missing.status).toBe(404);
  });

  it('entregado no promete ETA ni se puede cancelar', async () => {
    const orderId = await placeOrder(ana);
    await advanceTo(orderId, ['confirmed', 'preparing', 'ready', 'on_the_way', 'delivered']);

    const response = await request(server).get(`/api/orders/${orderId}`).set(auth(ana.token));

    expect(response.body.status).toBe('delivered');
    expect(response.body.etaMinutes).toBeNull();
    expect(response.body.canCancel).toBe(false);
    expect(response.body.history.map((event: { status: string }) => event.status)).toEqual([
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'on_the_way',
      'delivered',
    ]);
  });
});

describe('POST /api/admin/orders/:id/status', () => {
  it('pasa al siguiente estado y lo registra en el historial con el admin', async () => {
    const orderId = await placeOrder(ana);

    const response = await adminSetStatus(orderId, 'confirmed');

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('confirmed');
    expect(response.body.nextStatuses).toEqual(['preparing', 'cancelled']);
    const last = response.body.history[response.body.history.length - 1];
    expect(last).toMatchObject({ status: 'confirmed', changedByName: 'Administrador' });
  });

  it('un salto inválido responde 409 y el pedido no cambia', async () => {
    const orderId = await placeOrder(ana);

    const response = await adminSetStatus(orderId, 'delivered');

    expect(response.status).toBe(409);
    expect(await currentStatus(orderId)).toEqual({ status: 'pending' });
    expect(await prisma.orderStatusHistory.count({ where: { orderId } })).toBe(1);
  });

  it('un cliente no entra a las rutas de admin', async () => {
    const orderId = await placeOrder(ana);

    const list = await request(server).get('/api/admin/orders').set(auth(ana.token));
    const change = await request(server)
      .post(`/api/admin/orders/${orderId}/status`)
      .set(auth(ana.token))
      .send({ status: 'confirmed' });

    expect(list.status).toBe(403);
    expect(change.status).toBe(403);
    expect(await currentStatus(orderId)).toEqual({ status: 'pending' });
  });
});

describe('POST /api/orders/:id/cancel', () => {
  it('cancela un pedido pendiente y lo deja en el historial', async () => {
    const orderId = await placeOrder(ana);

    const response = await request(server).post(`/api/orders/${orderId}/cancel`).set(auth(ana.token));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('cancelled');
    expect(response.body.canCancel).toBe(false);
    expect(response.body.etaMinutes).toBeNull();
    expect(response.body.history.map((event: { status: string }) => event.status)).toEqual([
      'pending',
      'cancelled',
    ]);
    const event = await prisma.orderStatusHistory.findFirst({ where: { orderId, status: 'cancelled' } });
    expect(event?.changedByUserId).toBe(ana.userId);
  });

  it('cancela un pedido confirmado', async () => {
    const orderId = await placeOrder(ana);
    await advanceTo(orderId, ['confirmed']);

    const response = await request(server).post(`/api/orders/${orderId}/cancel`).set(auth(ana.token));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('cancelled');
  });

  it('en preparación responde 409 y el pedido no cambia', async () => {
    const orderId = await placeOrder(ana);
    await advanceTo(orderId, ['confirmed', 'preparing']);

    const response = await request(server).post(`/api/orders/${orderId}/cancel`).set(auth(ana.token));

    expect(response.status).toBe(409);
    expect(await currentStatus(orderId)).toEqual({ status: 'preparing' });
    expect(await prisma.orderStatusHistory.count({ where: { orderId, status: 'cancelled' } })).toBe(0);
  });

  it('un pedido ya cancelado no se vuelve a cancelar', async () => {
    const orderId = await placeOrder(ana);
    await request(server).post(`/api/orders/${orderId}/cancel`).set(auth(ana.token));

    const again = await request(server).post(`/api/orders/${orderId}/cancel`).set(auth(ana.token));

    expect(again.status).toBe(409);
    expect(await prisma.orderStatusHistory.count({ where: { orderId, status: 'cancelled' } })).toBe(1);
  });

  it('no puedo cancelar el pedido de otro cliente', async () => {
    const orderId = await placeOrder(beto);

    const response = await request(server).post(`/api/orders/${orderId}/cancel`).set(auth(ana.token));

    expect(response.status).toBe(404);
    expect(await currentStatus(orderId)).toEqual({ status: 'pending' });
  });

  it('el admin también cancela, y después de preparar ya no', async () => {
    const cancellable = await placeOrder(ana);
    const preparing = await placeOrder(ana);
    await advanceTo(preparing, ['confirmed', 'preparing']);

    const ok = await request(server).post(`/api/admin/orders/${cancellable}/cancel`).set(auth(adminToken));
    const late = await request(server).post(`/api/admin/orders/${preparing}/cancel`).set(auth(adminToken));

    expect(ok.status).toBe(201);
    expect(ok.body.status).toBe('cancelled');
    expect(late.status).toBe(409);
  });
});

describe('POST /api/orders/:id/repeat', () => {
  it('suma los ítems al carrito que ya tenía, con adicionales y observaciones', async () => {
    const orderId = await placeOrder(ana, [
      { productId: burger.id, quantity: 2, extraIds: [bacon.id], notes: 'sin cebolla' },
      { productId: drink.id, quantity: 1 },
    ]);
    // Lo que el cliente ya tenía armado no se pierde: la gaseosa suma cantidad en la misma línea.
    await request(server).post('/api/cart/items').set(auth(ana.token)).send({ productId: drink.id, quantity: 3 });
    const ordersBefore = await prisma.order.count({ where: { userId: ana.userId } });

    const response = await request(server).post(`/api/orders/${orderId}/repeat`).set(auth(ana.token));

    expect(response.status).toBe(200);
    expect(response.body.skipped).toEqual([]);
    const items = response.body.cart.items;
    expect(items).toHaveLength(2);
    expect(items.find((item: { productId: string }) => item.productId === drink.id).quantity).toBe(4);
    const burgerLine = items.find((item: { productId: string }) => item.productId === burger.id);
    expect(burgerLine).toMatchObject({ quantity: 2, notes: 'sin cebolla', extrasTotal: 2000, subtotal: 44000 });
    expect(burgerLine.extras.map((extra: { id: string }) => extra.id)).toEqual([bacon.id]);

    // No crea un pedido: el nuevo sale del checkout.
    expect(await prisma.order.count({ where: { userId: ana.userId } })).toBe(ordersBefore);
  });

  it('omite lo que ya no está disponible y lo avisa', async () => {
    const orderId = await placeOrder(ana, [
      { productId: burger.id, quantity: 1, extraIds: [bacon.id] },
      { productId: drink.id, quantity: 1 },
    ]);
    await prisma.product.updateMany({ where: { id: { in: [bacon.id, drink.id] } }, data: { available: false } });

    const response = await request(server).post(`/api/orders/${orderId}/repeat`).set(auth(ana.token));

    expect(response.status).toBe(200);
    expect(response.body.cart.items).toHaveLength(1);
    expect(response.body.cart.items[0]).toMatchObject({ productId: burger.id, quantity: 1, extras: [] });
    expect(response.body.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'extra', name: bacon.name }),
        expect.objectContaining({ kind: 'product', name: drink.name }),
      ]),
    );
  });

  it('no puedo repetir el pedido de otro cliente', async () => {
    const orderId = await placeOrder(beto);

    const response = await request(server).post(`/api/orders/${orderId}/repeat`).set(auth(ana.token));

    expect(response.status).toBe(404);
    const cart = await request(server).get('/api/cart').set(auth(ana.token));
    expect(cart.body.items).toHaveLength(0);
  });
});
