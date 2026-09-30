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

// La sucursal de prueba está lejos de las reales (Rosario) y las direcciones de los clientes caen justo
// encima: es la más cercana, así que se le asigna cada pedido de este archivo.
const LOCATION = { latitude: -32.9468, longitude: -60.6393 };

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;

type Customer = { token: string; userId: string; addressId: string };
type Product = { id: string; name: string };

let adminToken: string;
let ana: Customer;
let beto: Customer;
let branch: { id: string; name: string };
let otherBranch: { id: string; name: string };
let otherCategoryId: string;
let burger: Product;
let bacon: Product;
let drink: Product;

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

function createBranch(name: string, active: boolean) {
  return prisma.branch.create({
    data: {
      name: `${name} ${stamp}`,
      address: 'Bv. Oroño 1000, Rosario',
      ...LOCATION,
      openingHours: 'Lun-Dom 10:00-23:00',
      phone: '+54 341 400-0000',
      active,
    },
    select: { id: true, name: true },
  });
}

async function registerCustomer(alias: string): Promise<Customer> {
  const register = await request(server)
    .post('/api/auth/register')
    .send({ email: `stock.e2e.${alias}.${stamp}@rapido.local`, name: `Cliente ${alias}`, password: 'Cliente123!' });
  expect(register.status).toBe(201);
  const token: string = register.body.accessToken;

  const address = await request(server)
    .post('/api/me/addresses')
    .set(auth(token))
    .send({ street: 'Bv. Oroño 1000, Rosario', ...LOCATION, isDefault: true });
  expect(address.status).toBe(201);

  return { token, userId: register.body.user.id, addressId: address.body.id };
}

function setStock(product: Product, available: number, reserved = 0) {
  return prisma.stock.upsert({
    where: { branchId_productId: { branchId: branch.id, productId: product.id } },
    update: { available, reserved },
    create: { branchId: branch.id, productId: product.id, available, reserved },
  });
}

async function stockOf(product: Product) {
  const row = await prisma.stock.findUnique({
    where: { branchId_productId: { branchId: branch.id, productId: product.id } },
    select: { available: true, reserved: true },
  });
  return row ?? { available: 0, reserved: 0 };
}

async function checkout(customer: Customer, lines: object[]) {
  for (const line of lines) {
    const added = await request(server).post('/api/cart/items').set(auth(customer.token)).send(line);
    expect(added.status).toBe(201);
  }
  return request(server).post('/api/orders').set(auth(customer.token)).send({ addressId: customer.addressId });
}

async function placeOrder(customer: Customer, lines: object[]) {
  const response = await checkout(customer, lines);
  expect(response.status).toBe(201);
  expect(response.body.branch.id).toBe(branch.id);
  return response.body.id as string;
}

function guestOrder(items: object[]) {
  return request(server)
    .post('/api/orders/guest')
    .send({
      name: 'Invitado Stock',
      email: `guest.stock.e2e.${stamp}@rapido.local`,
      street: 'Bv. Oroño 1000, Rosario',
      ...LOCATION,
      items,
    });
}

async function advanceTo(orderId: string, statuses: OrderStatus[]) {
  for (const status of statuses) {
    const response = await request(server)
      .post(`/api/admin/orders/${orderId}/status`)
      .set(auth(adminToken))
      .send({ status });
    expect(response.status).toBe(201);
  }
}

function countOrders(customer: Customer) {
  return prisma.order.count({ where: { userId: customer.userId } });
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
    data: { name: `E2E Stock Otros ${stamp}`, slug: `e2e-stock-otros-${stamp}` },
  });
  otherCategoryId = other.id;

  burger = await createProduct('E2E Stock Hamburguesa', '20000.00', hamburguesas.id);
  bacon = await createProduct('E2E Stock Bacon', '2000.00', adicional.id);
  drink = await createProduct('E2E Stock Gaseosa', '1500.00', other.id);

  branch = await createBranch('Sucursal E2E Stock', true);
  // Inactiva: no participa de la asignación, solo sirve para ver que el stock es por sucursal.
  otherBranch = await createBranch('Sucursal E2E Stock Inactiva', false);

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
  // Cada test carga el stock que necesita; sin fila, el producto está en 0.
  await prisma.stock.deleteMany({ where: { productId: { in: [burger.id, bacon.id, drink.id] } } });
});

afterAll(async () => {
  const branchIds = [branch, otherBranch].filter(Boolean).map((created) => created.id);
  const orders = await prisma.order.findMany({
    where: { branchId: { in: branchIds } },
    select: { id: true, userId: true, addressId: true },
  });
  await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
  // Las direcciones de pedidos de invitado no cuelgan de un usuario: no se borran en cascada.
  const guestAddressIds = orders.filter((order) => !order.userId).map((order) => order.addressId);
  await prisma.address.deleteMany({ where: { id: { in: guestAddressIds } } });
  const userIds = [ana, beto].filter(Boolean).map((customer) => customer.userId);
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.product.deleteMany({ where: { id: { in: [burger, bacon, drink].map((product) => product.id) } } });
  await prisma.category.deleteMany({ where: { id: otherCategoryId } });
  await prisma.branch.deleteMany({ where: { id: { in: branchIds } } });
  await app.close();
});

describe('Stock por sucursal (HU-17)', () => {
  const list = (branchId: string, token = adminToken) =>
    request(server).get(`/api/admin/branches/${branchId}/stock`).set(auth(token));
  const put = (branchId: string, productId: string, body: object, token = adminToken) =>
    request(server).put(`/api/admin/branches/${branchId}/stock/${productId}`).set(auth(token)).send(body);
  const itemOf = (items: { productId: string }[], product: Product) =>
    items.find((item) => item.productId === product.id);

  it('lista todos los productos de la sucursal; sin fila de stock salen en 0', async () => {
    await setStock(burger, 7, 2);

    const response = await list(branch.id);

    expect(response.status).toBe(200);
    expect(itemOf(response.body, burger)).toEqual({
      productId: burger.id,
      productName: burger.name,
      productAvailable: true,
      imageUrl: '',
      categories: [expect.objectContaining({ slug: 'hamburguesas' })],
      available: 7,
      reserved: 2,
      updatedAt: expect.any(String),
    });
    expect(itemOf(response.body, drink)).toMatchObject({ available: 0, reserved: 0, updatedAt: null });
  });

  it('el admin carga lo disponible y lo reservado no cambia', async () => {
    const created = await put(branch.id, drink.id, { available: 20 });
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ productId: drink.id, available: 20, reserved: 0 });

    await setStock(burger, 5, 3);
    const updated = await put(branch.id, burger.id, { available: 12 });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ productId: burger.id, available: 12, reserved: 3 });
    expect(await stockOf(burger)).toEqual({ available: 12, reserved: 3 });
  });

  it('un producto puede tener stock en una sucursal y 0 en otra', async () => {
    expect((await put(branch.id, burger.id, { available: 10 })).status).toBe(200);

    const here = await list(branch.id);
    const there = await list(otherBranch.id);

    expect(itemOf(here.body, burger)).toMatchObject({ available: 10 });
    expect(itemOf(there.body, burger)).toMatchObject({ available: 0, reserved: 0 });
  });

  it('valida la cantidad: entera, no negativa y solo available', async () => {
    const invalid = [{ available: -1 }, { available: 1.5 }, { available: 'mucho' }, {}, { available: 5, reserved: 2 }];
    for (const body of invalid) {
      const response = await put(branch.id, burger.id, body);
      expect(response.status).toBe(400);
    }
    expect(await stockOf(burger)).toEqual({ available: 0, reserved: 0 });
  });

  it('responde 404 si la sucursal o el producto no existen', async () => {
    expect((await list('no-existe')).status).toBe(404);
    expect((await put('no-existe', burger.id, { available: 1 })).status).toBe(404);
    expect((await put(branch.id, 'no-existe', { available: 1 })).status).toBe(404);
  });

  it('un cliente no ve ni carga stock', async () => {
    expect((await list(branch.id, ana.token)).status).toBe(403);
    expect((await put(branch.id, burger.id, { available: 99 }, ana.token)).status).toBe(403);
    expect((await request(server).get(`/api/admin/branches/${branch.id}/stock`)).status).toBe(401);
    expect(await stockOf(burger)).toEqual({ available: 0, reserved: 0 });
  });
});

describe('Verificar y reservar al confirmar (HU-18)', () => {
  it('confirmar reserva cada producto y cada adicional, por la cantidad pedida', async () => {
    await setStock(burger, 5);
    await setStock(bacon, 5);
    await setStock(drink, 5);

    const orderId = await placeOrder(ana, [
      { productId: burger.id, quantity: 2, extraIds: [bacon.id] },
      { productId: drink.id, quantity: 1 },
    ]);

    expect(await stockOf(burger)).toEqual({ available: 3, reserved: 2 });
    expect(await stockOf(bacon)).toEqual({ available: 3, reserved: 2 });
    expect(await stockOf(drink)).toEqual({ available: 4, reserved: 1 });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.stockReserved).toBe(true);
  });

  it('sin stock suficiente responde 409 nombrando el producto y no crea el pedido', async () => {
    await setStock(burger, 1);
    await setStock(drink, 5);
    const before = await countOrders(ana);

    const response = await checkout(ana, [
      { productId: burger.id, quantity: 2 },
      { productId: drink.id, quantity: 1 },
    ]);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'OUT_OF_STOCK',
      message: `No hay stock suficiente de "${burger.name}" en ${branch.name} (quedan 1)`,
      branch: { id: branch.id, name: branch.name },
      items: [{ productId: burger.id, name: burger.name, requested: 2, available: 1 }],
    });
    expect(await countOrders(ana)).toBe(before);
    // Nada queda reservado a medias, ni siquiera lo que sí alcanzaba, y el carrito sigue lleno.
    expect(await stockOf(burger)).toEqual({ available: 1, reserved: 0 });
    expect(await stockOf(drink)).toEqual({ available: 5, reserved: 0 });
    const cart = await request(server).get('/api/cart').set(auth(ana.token));
    expect(cart.body.items).toHaveLength(2);
  });

  it('un producto sin fila de stock en la sucursal no se vende ahí', async () => {
    const response = await checkout(ana, [{ productId: drink.id, quantity: 1 }]);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(`No hay stock suficiente de "${drink.name}" en ${branch.name}`);
    expect(response.body.items).toEqual([{ productId: drink.id, name: drink.name, requested: 1, available: 0 }]);
  });

  it('un adicional sin stock también frena el pedido', async () => {
    await setStock(burger, 5);

    const response = await checkout(ana, [{ productId: burger.id, quantity: 1, extraIds: [bacon.id] }]);

    expect(response.status).toBe(409);
    expect(response.body.message).toContain(`"${bacon.name}"`);
    expect(response.body.items).toEqual([expect.objectContaining({ productId: bacon.id, requested: 1 })]);
    expect(await stockOf(burger)).toEqual({ available: 5, reserved: 0 });
  });

  it('si faltan varios productos, el 409 los nombra a todos', async () => {
    const response = await checkout(ana, [
      { productId: burger.id, quantity: 1 },
      { productId: drink.id, quantity: 2 },
    ]);

    expect(response.status).toBe(409);
    expect(response.body.message).toContain(`"${burger.name}"`);
    expect(response.body.message).toContain(`"${drink.name}"`);
    expect(response.body.items).toHaveLength(2);
  });

  it('el pedido de invitado también verifica y reserva', async () => {
    await setStock(burger, 3);

    const first = await guestOrder([{ productId: burger.id, quantity: 2 }]);
    const second = await guestOrder([{ productId: burger.id, quantity: 2 }]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('OUT_OF_STOCK');
    expect(await stockOf(burger)).toEqual({ available: 1, reserved: 2 });
  });

  it('dos pedidos a la vez por la última unidad: uno entra y el otro recibe 409', async () => {
    await setStock(drink, 1);
    for (const customer of [ana, beto]) {
      const added = await request(server)
        .post('/api/cart/items')
        .set(auth(customer.token))
        .send({ productId: drink.id, quantity: 1 });
      expect(added.status).toBe(201);
    }

    const responses = await Promise.all(
      [ana, beto].map((customer) =>
        request(server).post('/api/orders').set(auth(customer.token)).send({ addressId: customer.addressId }),
      ),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await stockOf(drink)).toEqual({ available: 0, reserved: 1 });
  });

  it('repetir un pedido arma el carrito pero no reserva', async () => {
    await setStock(drink, 5);
    const orderId = await placeOrder(ana, [{ productId: drink.id, quantity: 1 }]);

    const repeat = await request(server).post(`/api/orders/${orderId}/repeat`).set(auth(ana.token));

    expect(repeat.status).toBe(200);
    expect(await stockOf(drink)).toEqual({ available: 4, reserved: 1 });
  });
});

describe('Liberar al cancelar y descontar al entregar (HU-18)', () => {
  it('el cliente cancela un pedido pendiente y la reserva vuelve a estar disponible', async () => {
    await setStock(burger, 5);
    await setStock(bacon, 5);
    const orderId = await placeOrder(ana, [{ productId: burger.id, quantity: 2, extraIds: [bacon.id] }]);

    const cancel = await request(server).post(`/api/orders/${orderId}/cancel`).set(auth(ana.token));

    expect(cancel.status).toBe(200);
    expect(await stockOf(burger)).toEqual({ available: 5, reserved: 0 });
    expect(await stockOf(bacon)).toEqual({ available: 5, reserved: 0 });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.stockReserved).toBe(false);
  });

  it('el admin cancela un pedido confirmado y también libera', async () => {
    await setStock(drink, 5);
    const orderId = await placeOrder(ana, [{ productId: drink.id, quantity: 2 }]);
    await advanceTo(orderId, ['confirmed']);

    const cancel = await request(server).post(`/api/admin/orders/${orderId}/cancel`).set(auth(adminToken));

    expect(cancel.status).toBe(201);
    expect(cancel.body.status).toBe('cancelled');
    expect(await stockOf(drink)).toEqual({ available: 5, reserved: 0 });
  });

  it('al entregar, la reserva se descuenta y no vuelve a disponible', async () => {
    await setStock(drink, 5);
    const orderId = await placeOrder(ana, [{ productId: drink.id, quantity: 2 }]);
    await advanceTo(orderId, ['confirmed', 'preparing', 'ready', 'on_the_way']);
    expect(await stockOf(drink)).toEqual({ available: 3, reserved: 2 });

    await advanceTo(orderId, ['delivered']);

    expect(await stockOf(drink)).toEqual({ available: 3, reserved: 0 });
  });

  it('un pedido anterior al stock (sin reserva) no mueve el stock al cancelar ni al entregar', async () => {
    await setStock(drink, 10);
    const toCancel = await placeOrder(ana, [{ productId: drink.id, quantity: 1 }]);
    const toDeliver = await placeOrder(ana, [{ productId: drink.id, quantity: 1 }]);
    // Así quedan los pedidos que ya existían al aplicar la migración.
    await prisma.order.updateMany({ where: { id: { in: [toCancel, toDeliver] } }, data: { stockReserved: false } });
    await setStock(drink, 10, 0);

    const cancel = await request(server).post(`/api/orders/${toCancel}/cancel`).set(auth(ana.token));
    await advanceTo(toDeliver, ['confirmed', 'preparing', 'ready', 'on_the_way', 'delivered']);

    expect(cancel.status).toBe(200);
    expect(await stockOf(drink)).toEqual({ available: 10, reserved: 0 });
  });
});
