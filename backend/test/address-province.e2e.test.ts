import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';
const EMAIL_PREFIX = 'province.e2e.';
const PASSWORD = 'Cliente123!';

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;
let adminToken: string;
const branchIds: string[] = [];

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function registerCustomer() {
  const email = `${EMAIL_PREFIX}${Date.now()}.${Math.random().toString(36).slice(2, 8)}@rapido.local`;
  const response = await request(server)
    .post('/api/auth/register')
    .send({ email, name: 'Cliente provincia', password: PASSWORD });
  expect(response.status).toBe(201);
  return { id: response.body.user.id as string, token: response.body.accessToken as string };
}

function createAddress(token: string, body: object) {
  return request(server).post('/api/me/addresses').set(auth(token)).send(body);
}

const place = {
  street: 'Av. Rivadavia 5000',
  city: 'Caballito',
  province: 'Ciudad Autónoma de Buenos Aires',
  postalCode: '1406',
  latitude: -34.61,
  longitude: -58.42,
};

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
}, 30_000);

afterAll(async () => {
  if (branchIds.length > 0) {
    await prisma.branch.deleteMany({ where: { id: { in: branchIds } } });
  }
  const users = await prisma.user.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length > 0) {
    await prisma.address.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await app.close();
});

describe('Dirección con ciudad, provincia y código postal (HU-34)', () => {
  it('guarda los tres campos y los devuelve en el listado', async () => {
    const customer = await registerCustomer();

    const created = await createAddress(customer.token, place);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      street: 'Av. Rivadavia 5000',
      city: 'Caballito',
      province: 'Ciudad Autónoma de Buenos Aires',
      postalCode: '1406',
    });

    const list = await request(server).get('/api/me/addresses').set(auth(customer.token));
    expect(list.status).toBe(200);
    expect(list.body[0]).toMatchObject({ city: 'Caballito', postalCode: '1406' });
  });

  it('sin ciudad, provincia ni CP la dirección se guarda igual, con los campos vacíos', async () => {
    const customer = await registerCustomer();
    const created = await createAddress(customer.token, {
      street: 'Av. Rivadavia 5000, CABA',
      latitude: place.latitude,
      longitude: place.longitude,
    });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ city: null, province: null, postalCode: null });
  });

  it('acepta el CPA y lo guarda en mayúsculas', async () => {
    const customer = await registerCustomer();
    const created = await createAddress(customer.token, { ...place, postalCode: ' c1406 abc ' });

    expect(created.status).toBe(201);
    expect(created.body.postalCode).toBe('C1406ABC');
  });

  it('rechaza una provincia fuera de la lista y un CP mal escrito', async () => {
    const customer = await registerCustomer();

    expect((await createAddress(customer.token, { ...place, province: 'CABA' })).status).toBe(400);
    expect((await createAddress(customer.token, { ...place, postalCode: '14' })).status).toBe(400);
    expect((await createAddress(customer.token, { ...place, postalCode: 'C1406' })).status).toBe(400);
  });

  it('la edición cambia la provincia y un campo vacío lo borra', async () => {
    const customer = await registerCustomer();
    const created = await createAddress(customer.token, place);
    expect(created.status).toBe(201);

    const moved = await request(server)
      .patch(`/api/me/addresses/${created.body.id}`)
      .set(auth(customer.token))
      .send({ city: 'Córdoba', province: 'Córdoba', postalCode: '5000' });
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({ city: 'Córdoba', province: 'Córdoba', postalCode: '5000' });

    const cleared = await request(server)
      .patch(`/api/me/addresses/${created.body.id}`)
      .set(auth(customer.token))
      .send({ postalCode: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body).toMatchObject({ city: 'Córdoba', postalCode: null });
  });

  it('el detalle del cliente en el admin muestra ciudad, provincia y CP', async () => {
    const customer = await registerCustomer();
    expect((await createAddress(customer.token, place)).status).toBe(201);

    const detail = await request(server).get(`/api/admin/customers/${customer.id}`).set(auth(adminToken));
    expect(detail.status).toBe(200);
    expect(detail.body.addresses[0]).toMatchObject({
      city: 'Caballito',
      province: 'Ciudad Autónoma de Buenos Aires',
      postalCode: '1406',
    });
  });
});

describe('Sucursal con ciudad, provincia y código postal', () => {
  const branch = {
    name: 'Mordi Provincia e2e',
    address: 'Av. Corrientes 1234',
    city: 'San Nicolás',
    province: 'Ciudad Autónoma de Buenos Aires',
    postalCode: 'c1043 aaz',
    latitude: -34.6037,
    longitude: -58.3816,
    openingHours: 'Lun-Dom 10:00-23:00',
    phone: '+54 11 4000-0000',
  };

  async function createBranch(body: object) {
    const response = await request(server).post('/api/admin/branches').set(auth(adminToken)).send(body);
    if (response.status === 201) branchIds.push(response.body.id);
    return response;
  }

  it('el admin la crea con los tres campos y la lista pública los devuelve', async () => {
    const created = await createBranch(branch);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      address: 'Av. Corrientes 1234',
      city: 'San Nicolás',
      province: 'Ciudad Autónoma de Buenos Aires',
      postalCode: 'C1043AAZ',
    });

    const list = await request(server).get('/api/branches');
    expect(list.status).toBe(200);
    expect(list.body.branches.find((item: { id: string }) => item.id === created.body.id)).toMatchObject({
      city: 'San Nicolás',
      province: 'Ciudad Autónoma de Buenos Aires',
      postalCode: 'C1043AAZ',
    });
  });

  it('sin los campos se crea igual y la edición los completa o los borra', async () => {
    const { city: _city, province: _province, postalCode: _postalCode, ...bare } = branch;
    const created = await createBranch(bare);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ city: null, province: null, postalCode: null });

    const filled = await request(server)
      .patch(`/api/admin/branches/${created.body.id}`)
      .set(auth(adminToken))
      .send({ city: 'Rosario', province: 'Santa Fe', postalCode: '2000' });
    expect(filled.status).toBe(200);
    expect(filled.body).toMatchObject({ city: 'Rosario', province: 'Santa Fe', postalCode: '2000' });

    const cleared = await request(server)
      .patch(`/api/admin/branches/${created.body.id}`)
      .set(auth(adminToken))
      .send({ city: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body).toMatchObject({ city: null, province: 'Santa Fe' });
  });

  it('rechaza una provincia fuera de la lista y un CP mal escrito', async () => {
    expect((await createBranch({ ...branch, province: 'CABA' })).status).toBe(400);
    expect((await createBranch({ ...branch, postalCode: '10' })).status).toBe(400);
  });
});
