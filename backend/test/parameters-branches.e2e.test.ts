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

// Sucursales de prueba en Córdoba, lejos de las reales. NORTH queda a ~3 km de CENTER y EAST a
// ~3,7 km de CENTER y ~4,8 km de NORTH.
const CENTER = { latitude: -31.4201, longitude: -64.1888 };
const NORTH = { latitude: -31.393, longitude: -64.1888 };
const EAST = { latitude: -31.4201, longitude: -64.15 };

// Los valores con los que arranca cada test; al final se restauran los que tenía la base.
const BASELINE = {
  coverage_radius_km: '5',
  eta_prep_base_min: '15',
  eta_min_per_item: '3',
  eta_km_per_min: '0.5',
};

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;

type Customer = { token: string; userId: string; addressId: string };

let adminToken: string;
let ana: Customer;
let beto: Customer;
let center: { id: string };
let north: { id: string };
let closed: { id: string };
let drink: { id: string; name: string };
let otherCategoryId: string;
let originalParameters: Parameter[] = [];

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function createBranch(name: string, location: { latitude: number; longitude: number }, active = true) {
  return prisma.branch.create({
    data: {
      name: `${name} ${stamp}`,
      address: 'Av. Colón 100, Córdoba',
      ...location,
      openingHours: 'Lun-Dom 11:00-23:30',
      phone: '+54 351 400-0000',
      active,
    },
    select: { id: true },
  });
}

async function registerCustomer(alias: string, location: { latitude: number; longitude: number }): Promise<Customer> {
  const register = await request(server)
    .post('/api/auth/register')
    .send({ email: `params.e2e.${alias}.${stamp}@rapido.local`, name: `Cliente ${alias}`, password: 'Cliente123!' });
  expect(register.status).toBe(201);
  const token: string = register.body.accessToken;

  const address = await request(server)
    .post('/api/me/addresses')
    .set(auth(token))
    .send({ street: 'Av. Colón 100, Córdoba', ...location, isDefault: true });
  expect(address.status).toBe(201);

  return { token, userId: register.body.user.id, addressId: address.body.id };
}

function patchParameters(body: object, token = adminToken) {
  return request(server).patch('/api/admin/parameters').set(auth(token)).send(body);
}

function available(query: Record<string, string | number>, token?: string) {
  const call = request(server).get('/api/branches/available').query(query);
  return token ? call.set(auth(token)) : call;
}

async function checkout(customer: Customer, addressId = customer.addressId, quantity = 1) {
  const added = await request(server)
    .post('/api/cart/items')
    .set(auth(customer.token))
    .send({ productId: drink.id, quantity });
  expect(added.status).toBe(201);
  return request(server).post('/api/orders').set(auth(customer.token)).send({ addressId });
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

  originalParameters = await prisma.parameter.findMany();

  const other = await prisma.category.create({
    data: { name: `E2E Parametros Otros ${stamp}`, slug: `e2e-parametros-otros-${stamp}` },
  });
  otherCategoryId = other.id;
  drink = await prisma.product.create({
    data: {
      name: `E2E Parametros Gaseosa ${stamp}`,
      slug: `e2e-parametros-gaseosa-${stamp}`,
      description: 'Producto de prueba',
      price: new Prisma.Decimal('1500.00'),
      categories: { connect: { id: other.id } },
    },
    select: { id: true, name: true },
  });

  center = await createBranch('Sucursal E2E Radio Centro', CENTER);
  north = await createBranch('Sucursal E2E Radio Norte', NORTH);
  closed = await createBranch('Sucursal E2E Radio Cerrada', CENTER, false);
  await prisma.stock.createMany({
    data: [center, north, closed].map((branch) => ({ branchId: branch.id, productId: drink.id, available: 1000 })),
  });

  const login = await request(server)
    .post('/api/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(login.status).toBe(201);
  adminToken = login.body.accessToken;

  ana = await registerCustomer('ana', CENTER);
  beto = await registerCustomer('beto', NORTH);
}, 60_000);

beforeEach(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [ana.userId, beto.userId] } } } });
  for (const [key, value] of Object.entries(BASELINE)) {
    await prisma.parameter.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
});

afterAll(async () => {
  await prisma.parameter.deleteMany({ where: { key: { in: Object.keys(BASELINE) } } });
  for (const { key, value } of originalParameters) {
    await prisma.parameter.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  const branchIds = [center, north, closed].filter(Boolean).map((branch) => branch.id);
  const orders = await prisma.order.findMany({
    where: { branchId: { in: branchIds } },
    select: { id: true, userId: true, addressId: true },
  });
  await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
  const guestAddressIds = orders.filter((order) => !order.userId).map((order) => order.addressId);
  await prisma.address.deleteMany({ where: { id: { in: guestAddressIds } } });
  const userIds = [ana, beto].filter(Boolean).map((customer) => customer.userId);
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.product.deleteMany({ where: { id: drink.id } });
  await prisma.category.deleteMany({ where: { id: otherCategoryId } });
  await prisma.branch.deleteMany({ where: { id: { in: branchIds } } });
  await app.close();
});

describe('Parámetros del sistema (HU-19)', () => {
  const valuesOf = (list: { key: string; value: number }[]) =>
    Object.fromEntries(list.map((parameter) => [parameter.key, parameter.value]));

  it('lista radio y constantes de ETA con su valor, etiqueta y límites', async () => {
    const response = await request(server).get('/api/admin/parameters').set(auth(adminToken));

    expect(response.status).toBe(200);
    expect(response.body.map((parameter: { key: string }) => parameter.key)).toEqual([
      'coverage_radius_km',
      'eta_prep_base_min',
      'eta_min_per_item',
      'eta_km_per_min',
    ]);
    expect(response.body[0]).toEqual({
      key: 'coverage_radius_km',
      label: 'Radio de cobertura',
      description: expect.any(String),
      unit: 'km',
      value: 5,
      min: 0.1,
      max: 100,
      integer: false,
      updatedAt: expect.any(String),
    });
    expect(valuesOf(response.body)).toEqual({
      coverage_radius_km: 5,
      eta_prep_base_min: 15,
      eta_min_per_item: 3,
      eta_km_per_min: 0.5,
    });
  });

  it('actualiza solo los que vienen en el body', async () => {
    const response = await patchParameters({ coverage_radius_km: 7.5, eta_prep_base_min: 20 });

    expect(response.status).toBe(200);
    expect(valuesOf(response.body)).toEqual({
      coverage_radius_km: 7.5,
      eta_prep_base_min: 20,
      eta_min_per_item: 3,
      eta_km_per_min: 0.5,
    });
    const stored = await prisma.parameter.findUniqueOrThrow({ where: { key: 'coverage_radius_km' } });
    expect(stored.value).toBe('7.5');
  });

  it('valida claves y rangos', async () => {
    const invalid = [
      { coverage_radius_km: 0 },
      { coverage_radius_km: 500 },
      { eta_min_per_item: 2.5 },
      { eta_prep_base_min: -1 },
      { eta_prep_base_min: 'mucho' },
      { eta_km_per_min: 0 },
      { otra_clave: 1 },
    ];
    for (const body of invalid) {
      expect((await patchParameters(body)).status).toBe(400);
    }

    const response = await request(server).get('/api/admin/parameters').set(auth(adminToken));
    expect(valuesOf(response.body)).toEqual({
      coverage_radius_km: 5,
      eta_prep_base_min: 15,
      eta_min_per_item: 3,
      eta_km_per_min: 0.5,
    });
  });

  it('sin la fila en la base usa el valor por defecto', async () => {
    await prisma.parameter.delete({ where: { key: 'eta_min_per_item' } });

    const response = await request(server).get('/api/admin/parameters').set(auth(adminToken));

    expect(response.body.find((parameter: { key: string }) => parameter.key === 'eta_min_per_item')).toMatchObject({
      value: 3,
      updatedAt: null,
    });
  });

  it('un cliente no ve ni cambia los parámetros', async () => {
    expect((await request(server).get('/api/admin/parameters').set(auth(ana.token))).status).toBe(403);
    expect((await patchParameters({ coverage_radius_km: 50 }, ana.token)).status).toBe(403);
    expect((await request(server).get('/api/admin/parameters')).status).toBe(401);
    const stored = await prisma.parameter.findUniqueOrThrow({ where: { key: 'coverage_radius_km' } });
    expect(stored.value).toBe('5');
  });

  it('la hora estimada usa los parámetros vigentes al confirmar y después no cambia', async () => {
    await patchParameters({ eta_prep_base_min: 40, eta_min_per_item: 10 });

    // La dirección de ana está encima de la sucursal: el traslado es 0.
    const order = await checkout(ana, ana.addressId, 2);
    expect(order.status).toBe(201);
    const promised = (new Date(order.body.estimatedDeliveryAt).getTime() - new Date(order.body.createdAt).getTime()) / MINUTE_MS;
    expect(promised).toBe(40 + 2 * 10);

    await patchParameters({ eta_prep_base_min: 5, eta_min_per_item: 1 });
    const detail = await request(server).get(`/api/orders/${order.body.id}`).set(auth(ana.token));

    expect(detail.body.estimatedDeliveryAt).toBe(order.body.estimatedDeliveryAt);
  });
});

describe('GET /api/branches/available (HU-19)', () => {
  const testBranchIds = () => [center.id, north.id, closed.id];
  const idsOf = (body: { branches: { id: string }[] }) =>
    body.branches.map((branch) => branch.id).filter((id) => testBranchIds().includes(id));

  it('con lat/lng, sin sesión, lista las activas dentro del radio de la más cercana a la más lejana', async () => {
    const response = await available({ lat: CENTER.latitude, lng: CENTER.longitude });

    expect(response.status).toBe(200);
    expect(response.body.radiusKm).toBe(5);
    expect(idsOf(response.body)).toEqual([center.id, north.id]);
    expect(response.body.branches[0]).toEqual({
      id: center.id,
      name: `Sucursal E2E Radio Centro ${stamp}`,
      address: 'Av. Colón 100, Córdoba',
      phone: '+54 351 400-0000',
      openingHours: 'Lun-Dom 11:00-23:30',
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      distanceKm: 0,
    });
    expect(response.body.branches[1].distanceKm).toBeCloseTo(3.01, 1);
  });

  it('con un radio más chico, las lejanas quedan afuera', async () => {
    await patchParameters({ coverage_radius_km: 1 });

    const response = await available({ lat: CENTER.latitude, lng: CENTER.longitude });

    expect(response.body.radiusKm).toBe(1);
    expect(idsOf(response.body)).toEqual([center.id]);
  });

  it('con addressId usa la dirección guardada del cliente', async () => {
    const response = await available({ addressId: beto.addressId }, beto.token);

    expect(response.status).toBe(200);
    expect(idsOf(response.body)).toEqual([north.id, center.id]);
  });

  it('la dirección de otro cliente responde 404; sin sesión, 401', async () => {
    expect((await available({ addressId: beto.addressId }, ana.token)).status).toBe(404);
    expect((await available({ addressId: beto.addressId })).status).toBe(401);
  });

  it('un token inválido responde 401 aunque la ruta acepte invitados', async () => {
    const response = await available({ lat: CENTER.latitude, lng: CENTER.longitude }, 'no-es-un-token');
    expect(response.status).toBe(401);
  });

  it('sin ubicación o con coordenadas inválidas responde 400', async () => {
    expect((await available({})).status).toBe(400);
    expect((await available({ lat: CENTER.latitude })).status).toBe(400);
    expect((await available({ lat: 100, lng: 0 })).status).toBe(400);
    expect((await available({ lat: 'norte', lng: 0 })).status).toBe(400);
  });
});

describe('Asignación de sucursal dentro del radio al confirmar (HU-19)', () => {
  it('asigna la activa más cercana a la dirección', async () => {
    const fromCenter = await checkout(ana);
    const fromNorth = await checkout(beto);

    expect(fromCenter.status).toBe(201);
    expect(fromCenter.body.branch.id).toBe(center.id);
    expect(fromNorth.status).toBe(201);
    expect(fromNorth.body.branch.id).toBe(north.id);
  });

  it('si ninguna sucursal cubre la dirección responde 400 y no crea el pedido', async () => {
    const east = await request(server)
      .post('/api/me/addresses')
      .set(auth(ana.token))
      .send({ street: 'Av. Sabattini 3000, Córdoba', ...EAST });
    expect(east.status).toBe(201);
    await patchParameters({ coverage_radius_km: 2.5 });
    const before = await prisma.order.count({ where: { userId: ana.userId } });

    const response = await checkout(ana, east.body.id);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      code: 'OUT_OF_COVERAGE',
      message: 'No hay sucursales que lleguen a esa dirección (radio de 2,5 km)',
      radiusKm: 2.5,
    });
    expect(await prisma.order.count({ where: { userId: ana.userId } })).toBe(before);
    const cart = await request(server).get('/api/cart').set(auth(ana.token));
    expect(cart.body.items).toHaveLength(1);

    // Con el radio de siempre la misma dirección ya tiene sucursal.
    await patchParameters({ coverage_radius_km: 5 });
    const retry = await request(server).post('/api/orders').set(auth(ana.token)).send({ addressId: east.body.id });
    expect(retry.status).toBe(201);
    expect(retry.body.branch.id).toBe(center.id);
  });

  it('también vale para el pedido de invitado', async () => {
    await patchParameters({ coverage_radius_km: 2.5 });

    const response = await request(server)
      .post('/api/orders/guest')
      .send({
        name: 'Invitado Radio',
        email: `guest.params.e2e.${stamp}@rapido.local`,
        street: 'Av. Sabattini 3000, Córdoba',
        ...EAST,
        items: [{ productId: drink.id, quantity: 1 }],
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('OUT_OF_COVERAGE');
  });
});

describe('GET /api/admin/order-statuses (RF-ADM-08)', () => {
  it('lista los estados en el orden del ciclo de vida, con etiqueta y transiciones', async () => {
    const response = await request(server).get('/api/admin/order-statuses').set(auth(adminToken));

    expect(response.status).toBe(200);
    expect(response.body.map((status: { status: string }) => status.status)).toEqual([
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'on_the_way',
      'delivered',
      'cancelled',
    ]);
    expect(response.body[0]).toEqual({
      status: 'pending',
      label: 'Pendiente',
      description: expect.any(String),
      next: ['confirmed', 'cancelled'],
      cancellable: true,
      final: false,
    });
    expect(response.body[5]).toMatchObject({ status: 'delivered', label: 'Entregado', next: [], final: true });
  });

  it('un cliente no accede', async () => {
    expect((await request(server).get('/api/admin/order-statuses').set(auth(ana.token))).status).toBe(403);
  });
});
