import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Parameter, Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

const stamp = Date.now();
const MINUTE_MS = 60_000;

// Sucursales de prueba en Mendoza, lejos de las reales. NEAR queda a ~1,1 km del cliente, MID a ~3,3 km
// y FAR a ~20 km: con el radio de 5 km, FAR no llega a domicilio pero sí se puede retirar ahí.
const HOME = { latitude: -32.8895, longitude: -68.8458 };
const NEAR = { latitude: -32.8995, longitude: -68.8458 };
const MID = { latitude: -32.8895, longitude: -68.8114 };
const FAR = { latitude: -32.7095, longitude: -68.8458 };

const BASELINE = {
  coverage_radius_km: '5',
  eta_prep_base_min: '15',
  eta_min_per_item: '3',
  eta_km_per_min: '0.5',
  delivery_price_per_km: '0',
};

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;

type Customer = { token: string; userId: string; addressId: string };
type Product = { id: string; name: string };
type CheckoutBranch = { id: string; canFulfill: boolean; withinRadius: boolean | null; distanceKm: number | null };

let ana: Customer;
let near: { id: string; name: string };
let mid: { id: string; name: string };
let far: { id: string; name: string };
let inactive: { id: string; name: string };
let burger: Product;
let bacon: Product;
let categoryIds: string[] = [];
let originalParameters: Parameter[] = [];

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function createBranch(name: string, location: { latitude: number; longitude: number }, active = true) {
  return prisma.branch.create({
    data: {
      name: `${name} ${stamp}`,
      address: 'Av. San Martín 100, Mendoza',
      ...location,
      openingHours: 'Lun-Dom 11:00-23:30',
      phone: '+54 261 400-0000',
      active,
    },
    select: { id: true, name: true },
  });
}

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

function setStock(branch: { id: string }, product: Product, available: number) {
  return prisma.stock.upsert({
    where: { branchId_productId: { branchId: branch.id, productId: product.id } },
    update: { available, reserved: 0 },
    create: { branchId: branch.id, productId: product.id, available },
  });
}

async function stockOf(branch: { id: string }, product: Product) {
  const row = await prisma.stock.findUnique({
    where: { branchId_productId: { branchId: branch.id, productId: product.id } },
    select: { available: true, reserved: true },
  });
  return row ?? { available: 0, reserved: 0 };
}

async function fillCart(customer: Customer, lines: object[]) {
  for (const line of lines) {
    const added = await request(server).post('/api/cart/items').set(auth(customer.token)).send(line);
    expect(added.status).toBe(201);
  }
}

const orderCount = (customer: Customer) => prisma.order.count({ where: { userId: customer.userId } });
const burgerLine = () => ({ productId: burger.id, quantity: 1 });

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

  originalParameters = await prisma.parameter.findMany();

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
  categoryIds = [hamburguesas.id, adicional.id];
  burger = await createProduct('E2E Retiro Hamburguesa', '20000.00', hamburguesas.id);
  bacon = await createProduct('E2E Retiro Bacon', '2000.00', adicional.id);

  near = await createBranch('Sucursal E2E Retiro Cerca', NEAR);
  mid = await createBranch('Sucursal E2E Retiro Media', MID);
  far = await createBranch('Sucursal E2E Retiro Lejos', FAR);
  inactive = await createBranch('Sucursal E2E Retiro Inactiva', HOME, false);

  const register = await request(server)
    .post('/api/auth/register')
    .send({ email: `fulfillment.e2e.ana.${stamp}@rapido.local`, name: 'Cliente Ana', password: 'Cliente123!' });
  expect(register.status).toBe(201);
  const token: string = register.body.accessToken;
  const address = await request(server)
    .post('/api/me/addresses')
    .set(auth(token))
    .send({ street: 'Av. San Martín 100, Mendoza', ...HOME, isDefault: true });
  expect(address.status).toBe(201);
  ana = { token, userId: register.body.user.id, addressId: address.body.id };
}, 60_000);

beforeEach(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { userId: ana.userId } } });
  for (const [key, value] of Object.entries(BASELINE)) {
    await prisma.parameter.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  // Cada test arma su stock: las tres sucursales activas arrancan con de sobra.
  await prisma.stock.deleteMany({ where: { productId: { in: [burger.id, bacon.id] } } });
  for (const branch of [near, mid, far, inactive]) {
    await setStock(branch, burger, 10);
    await setStock(branch, bacon, 10);
  }
});

afterAll(async () => {
  await prisma.parameter.deleteMany({ where: { key: { in: Object.keys(BASELINE) } } });
  for (const { key, value } of originalParameters) {
    await prisma.parameter.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  const branchIds = [near, mid, far, inactive].filter(Boolean).map((branch) => branch.id);
  const orders = await prisma.order.findMany({
    where: { branchId: { in: branchIds } },
    select: { id: true, userId: true, addressId: true },
  });
  await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
  // Las direcciones de pedidos de invitado no cuelgan de un usuario: no se borran en cascada.
  const guestAddressIds = orders.flatMap((order) => (!order.userId && order.addressId ? [order.addressId] : []));
  await prisma.address.deleteMany({ where: { id: { in: guestAddressIds } } });
  if (ana) {
    await prisma.user.deleteMany({ where: { id: ana.userId } });
  }
  await prisma.product.deleteMany({ where: { id: { in: [burger, bacon].filter(Boolean).map((product) => product.id) } } });
  await prisma.branch.deleteMany({ where: { id: { in: branchIds } } });
  await app.close();
});

describe('POST /api/orders con retiro o domicilio (HU-23)', () => {
  const place = (body: object) => request(server).post('/api/orders').set(auth(ana.token)).send(body);

  it('retiro sin dirección: el pedido queda sin dirección, con la sucursal elegida y sin traslado en la hora', async () => {
    await fillCart(ana, [burgerLine()]);

    const response = await place({ fulfillment: 'pickup', branchId: far.id });

    expect(response.status).toBe(201);
    expect(response.body.fulfillment).toBe('pickup');
    expect(response.body.address).toBeNull();
    expect(response.body.branch.id).toBe(far.id);
    // FAR está a ~20 km: en retiro no hay traslado, solo la preparación (15 + 1 × 3).
    const promised =
      (new Date(response.body.estimatedDeliveryAt).getTime() - new Date(response.body.createdAt).getTime()) / MINUTE_MS;
    expect(promised).toBe(15 + 3);

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(stored.addressId).toBeNull();
    expect(stored.fulfillment).toBe('pickup');
    expect(await stockOf(far, burger)).toEqual({ available: 9, reserved: 1 });
  });

  it('retiro ignora la dirección que llegue: el pedido igual queda sin dirección', async () => {
    await fillCart(ana, [burgerLine()]);

    const response = await place({ fulfillment: 'pickup', branchId: near.id, addressId: ana.addressId });

    expect(response.status).toBe(201);
    expect(response.body.address).toBeNull();
  });

  it('el detalle del cliente y el del admin de un retiro muestran fulfillment y sin dirección', async () => {
    await fillCart(ana, [burgerLine()]);
    const created = await place({ fulfillment: 'pickup', branchId: near.id });
    expect(created.status).toBe(201);

    const mine = await request(server).get(`/api/orders/${created.body.id}`).set(auth(ana.token));
    expect(mine.status).toBe(200);
    expect(mine.body).toMatchObject({ fulfillment: 'pickup', address: null });

    const list = await request(server).get('/api/orders').set(auth(ana.token));
    expect(list.body.find((order: { id: string }) => order.id === created.body.id)).toMatchObject({
      fulfillment: 'pickup',
    });

    const login = await request(server).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const admin = await request(server)
      .get(`/api/admin/orders/${created.body.id}`)
      .set(auth(login.body.accessToken));
    expect(admin.status).toBe(200);
    expect(admin.body).toMatchObject({ fulfillment: 'pickup', address: null });
  });

  it('un retiro no pasa por en camino: de listo va directo a retirado', async () => {
    await fillCart(ana, [burgerLine()]);
    const created = await place({ fulfillment: 'pickup', branchId: near.id });
    expect(created.status).toBe(201);

    const login = await request(server).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const token = login.body.accessToken;
    const setStatus = (status: string) =>
      request(server).post(`/api/admin/orders/${created.body.id}/status`).set(auth(token)).send({ status });

    for (const status of ['confirmed', 'preparing', 'ready']) {
      expect((await setStatus(status)).status).toBe(201);
    }

    const ready = await request(server).get(`/api/admin/orders/${created.body.id}`).set(auth(token));
    expect(ready.body.status).toBe('ready');
    expect(ready.body.nextStatuses).toEqual(['delivered']);

    expect((await setStatus('on_the_way')).status).toBe(409);

    const delivered = await setStatus('delivered');
    expect(delivered.status).toBe(201);
    expect(delivered.body.status).toBe('delivered');
    expect(delivered.body.nextStatuses).toEqual([]);
  });

  it('domicilio: guarda la sucursal elegida (no la más cercana) y la dirección', async () => {
    await fillCart(ana, [burgerLine()]);

    // MID está a ~3,3 km; NEAR, a ~1,1 km.
    const response = await place({ fulfillment: 'delivery', branchId: mid.id, addressId: ana.addressId });

    expect(response.status).toBe(201);
    expect(response.body.fulfillment).toBe('delivery');
    expect(response.body.branch.id).toBe(mid.id);
    expect(response.body.address.id).toBe(ana.addressId);
    // El traslado sí cuenta: 15 + 3 + ceil(3,3 / 0,5) = 25.
    const promised =
      (new Date(response.body.estimatedDeliveryAt).getTime() - new Date(response.body.createdAt).getTime()) / MINUTE_MS;
    expect(promised).toBeGreaterThan(15 + 3);
  });

  it('domicilio con una sucursal fuera del radio responde 400 y no crea el pedido', async () => {
    await fillCart(ana, [burgerLine()]);
    const before = await orderCount(ana);

    const response = await place({ fulfillment: 'delivery', branchId: far.id, addressId: ana.addressId });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'OUT_OF_COVERAGE', radiusKm: 5 });
    expect(await orderCount(ana)).toBe(before);
    expect(await stockOf(far, burger)).toEqual({ available: 10, reserved: 0 });
    const cart = await request(server).get('/api/cart').set(auth(ana.token));
    expect(cart.body.items).toHaveLength(1);
  });

  it('una sucursal inactiva se rechaza en domicilio y en retiro', async () => {
    await fillCart(ana, [burgerLine()]);
    const before = await orderCount(ana);

    const delivery = await place({ fulfillment: 'delivery', branchId: inactive.id, addressId: ana.addressId });
    const pickup = await place({ fulfillment: 'pickup', branchId: inactive.id });

    for (const response of [delivery, pickup]) {
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('BRANCH_UNAVAILABLE');
    }
    expect(await orderCount(ana)).toBe(before);
  });

  it('sin stock en la sucursal elegida responde 409 con el producto y no crea el pedido', async () => {
    await setStock(near, burger, 0);
    await fillCart(ana, [burgerLine()]);
    const before = await orderCount(ana);

    const response = await place({ fulfillment: 'delivery', branchId: near.id, addressId: ana.addressId });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('OUT_OF_STOCK');
    expect(response.body.message).toContain(burger.name);
    expect(await orderCount(ana)).toBe(before);

    // La otra sucursal sí tiene: elegirla sale bien con el mismo carrito.
    const retry = await place({ fulfillment: 'delivery', branchId: mid.id, addressId: ana.addressId });
    expect(retry.status).toBe(201);
    expect(retry.body.branch.id).toBe(mid.id);
  });

  it('exige elegir retiro o domicilio, sucursal y, en domicilio, una dirección', async () => {
    await fillCart(ana, [burgerLine()]);
    const before = await orderCount(ana);

    expect((await place({ branchId: near.id, addressId: ana.addressId })).status).toBe(400);
    expect((await place({ fulfillment: 'envio', branchId: near.id })).status).toBe(400);
    expect((await place({ fulfillment: 'pickup' })).status).toBe(400);
    expect((await place({ fulfillment: 'delivery', branchId: near.id })).status).toBe(400);
    expect(await orderCount(ana)).toBe(before);
  });
});

describe('POST /api/orders/guest con retiro o domicilio (HU-23)', () => {
  const guest = (body: object) =>
    request(server)
      .post('/api/orders/guest')
      .send({
        name: 'Invitado Retiro',
        email: `guest.fulfillment.e2e.${stamp}@rapido.local`,
        items: [burgerLine()],
        ...body,
      });

  it('retiro sin dirección ni coordenadas', async () => {
    const response = await guest({ fulfillment: 'pickup', branchId: far.id });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ fulfillment: 'pickup', address: null });
    expect(response.body.branch.id).toBe(far.id);
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(stored.addressId).toBeNull();
  });

  it('domicilio guarda la dirección y la sucursal elegida', async () => {
    const response = await guest({
      fulfillment: 'delivery',
      branchId: mid.id,
      street: 'Av. San Martín 100, Mendoza',
      ...HOME,
    });

    expect(response.status).toBe(201);
    expect(response.body.branch.id).toBe(mid.id);
    expect(response.body.address.street).toBe('Av. San Martín 100, Mendoza');
  });

  it('domicilio fuera del radio responde 400 y no crea el pedido ni la dirección', async () => {
    const addressesBefore = await prisma.address.count({ where: { userId: null } });
    const ordersBefore = await prisma.order.count({ where: { branchId: far.id } });

    const response = await guest({
      fulfillment: 'delivery',
      branchId: far.id,
      street: 'Av. San Martín 100, Mendoza',
      ...HOME,
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('OUT_OF_COVERAGE');
    expect(await prisma.address.count({ where: { userId: null } })).toBe(addressesBefore);
    expect(await prisma.order.count({ where: { branchId: far.id } })).toBe(ordersBefore);
  });

  it('domicilio sin dirección responde 400', async () => {
    expect((await guest({ fulfillment: 'delivery', branchId: near.id })).status).toBe(400);
  });

  it('sin stock en la sucursal elegida responde 409', async () => {
    await setStock(near, burger, 0);

    const response = await guest({ fulfillment: 'pickup', branchId: near.id });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain(burger.name);
  });
});

describe('POST /api/branches/checkout (HU-23)', () => {
  const list = (body: object, token?: string) => {
    const call = request(server).post('/api/branches/checkout').send(body);
    return token ? call.set(auth(token)) : call;
  };
  // Solo las sucursales de este archivo: las reales del seed no están en Mendoza, pero no se asume.
  const mine = (branches: CheckoutBranch[]) =>
    branches.filter((branch) => [near, mid, far, inactive].some((created) => created.id === branch.id));
  const ids = (branches: CheckoutBranch[]) => mine(branches).map((branch) => branch.id);

  it('domicilio: solo las activas dentro del radio, de la más cercana a la más lejana', async () => {
    await fillCart(ana, [burgerLine()]);

    const response = await list({ fulfillment: 'delivery', addressId: ana.addressId }, ana.token);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ fulfillment: 'delivery', radiusKm: 5 });
    expect(ids(response.body.branches)).toEqual([near.id, mid.id]);
    expect(mine(response.body.branches)[0]).toMatchObject({
      name: near.name,
      canFulfill: true,
      withinRadius: true,
      missing: [],
    });
    expect(mine(response.body.branches)[0].distanceKm).toBeCloseTo(1.11, 1);
  });

  it('retiro: todas las activas, también las que no llegan a domicilio', async () => {
    await fillCart(ana, [burgerLine()]);

    const response = await list({ fulfillment: 'pickup', addressId: ana.addressId }, ana.token);

    expect(ids(response.body.branches)).toEqual([near.id, mid.id, far.id]);
    expect(mine(response.body.branches)[2]).toMatchObject({ withinRadius: false });
  });

  it('retiro sin ubicación: sin distancia, por nombre', async () => {
    await fillCart(ana, [burgerLine()]);

    const response = await list({ fulfillment: 'pickup' }, ana.token);

    expect(response.status).toBe(200);
    const listed = mine(response.body.branches);
    expect(listed.map((branch) => branch.id).sort()).toEqual([near.id, mid.id, far.id].sort());
    for (const branch of listed) {
      expect(branch).toMatchObject({ distanceKm: null, withinRadius: null });
    }
  });

  it('primero las que tienen stock de todo el carrito, productos y adicionales', async () => {
    await setStock(near, burger, 0);
    await setStock(mid, bacon, 0);
    await fillCart(ana, [{ productId: burger.id, quantity: 2, extraIds: [bacon.id] }]);

    const response = await list({ fulfillment: 'delivery', addressId: ana.addressId }, ana.token);

    // near no tiene hamburguesas ni mid tiene bacon: ninguna cumple; cada una dice qué le falta.
    expect(ids(response.body.branches)).toEqual([near.id, mid.id]);
    const [first, second] = mine(response.body.branches);
    expect(first).toMatchObject({
      canFulfill: false,
      missing: [{ productId: burger.id, name: burger.name, requested: 2, available: 0 }],
    });
    expect(second).toMatchObject({
      canFulfill: false,
      missing: [{ productId: bacon.id, name: bacon.name, requested: 2, available: 0 }],
    });

    // Con bacon en mid de nuevo, mid cumple y pasa adelante aunque esté más lejos.
    await setStock(mid, bacon, 10);
    const reordered = await list({ fulfillment: 'delivery', addressId: ana.addressId }, ana.token);
    expect(ids(reordered.body.branches)).toEqual([mid.id, near.id]);
    expect(mine(reordered.body.branches).map((branch) => branch.canFulfill)).toEqual([true, false]);
  });

  it('el invitado manda sus ítems y su ubicación', async () => {
    await setStock(near, burger, 0);

    const response = await list({ fulfillment: 'delivery', ...HOME, items: [burgerLine()] });

    expect(response.status).toBe(200);
    expect(ids(response.body.branches)).toEqual([mid.id, near.id]);
    expect(mine(response.body.branches).map((branch) => branch.canFulfill)).toEqual([true, false]);
  });

  it('un radio más chico deja afuera las lejanas', async () => {
    await prisma.parameter.upsert({
      where: { key: 'coverage_radius_km' },
      update: { value: '2' },
      create: { key: 'coverage_radius_km', value: '2' },
    });
    await fillCart(ana, [burgerLine()]);

    const response = await list({ fulfillment: 'delivery', addressId: ana.addressId }, ana.token);

    expect(response.body.radiusKm).toBe(2);
    expect(ids(response.body.branches)).toEqual([near.id]);
  });

  it('rechaza lo que no se puede resolver', async () => {
    // Carrito vacío (con sesión) o sin ítems (invitado).
    expect((await list({ fulfillment: 'pickup' }, ana.token)).status).toBe(400);
    expect((await list({ fulfillment: 'pickup', ...HOME })).status).toBe(400);

    await fillCart(ana, [burgerLine()]);
    // Domicilio sin dirección, tipo inválido y dirección de otro cliente.
    expect((await list({ fulfillment: 'delivery' }, ana.token)).status).toBe(400);
    expect((await list({ fulfillment: 'volando', addressId: ana.addressId }, ana.token)).status).toBe(400);
    expect(
      (await list({ fulfillment: 'delivery', addressId: ana.addressId, items: [burgerLine()] })).status,
    ).toBe(401);
  });
});

describe('POST /api/geocode (DEV-20)', () => {
  it('es público pero valida el cuerpo antes de consultar', async () => {
    expect((await request(server).post('/api/geocode').send({})).status).toBe(400);
    expect((await request(server).post('/api/geocode').send({ address: '   ' })).status).toBe(400);
  });
});
