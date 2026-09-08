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

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;

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
});

afterAll(async () => {
  await app.close();
});

describe('Sprint 1', () => {
  it('POST /api/auth/login happy path', async () => {
    const response = await request(server).post('/api/auth/login').send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    expect(response.status).toBe(201);
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.accessToken.length).toBeGreaterThan(10);
    expect(response.body.user.email).toBe(ADMIN_EMAIL);
    expect(response.body.user.role).toBe('admin');
  });

  it('POST /api/orders happy path', async () => {
    const stamp = Date.now();
    const email = `cliente.e2e.${stamp}@rapido.local`;
    const register = await request(server).post('/api/auth/register').send({
      email,
      name: 'Cliente E2E',
      password: 'Cliente123!',
    });
    expect(register.status).toBe(201);
    const token = register.body.accessToken as string;
    expect(token).toBeTruthy();

    const category = await prisma.category.upsert({
      where: { slug: 'e2e-test' },
      update: {},
      create: { name: 'E2E Test', slug: 'e2e-test' },
    });

    const product = await prisma.product.create({
      data: {
        name: `Burger E2E ${stamp}`,
        slug: `burger-e2e-${stamp}`,
        description: 'Producto de prueba',
        price: new Prisma.Decimal('1500.00'),
        available: true,
        categories: { connect: { id: category.id } },
        images: { create: { url: 'https://example.com/burger.png', sortOrder: 0 } },
      },
    });

    let branch = await prisma.branch.findFirst({ where: { active: true } });
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          name: 'Sucursal E2E',
          address: 'Av. Corrientes 1234, CABA',
          latitude: -34.6037,
          longitude: -58.3816,
          openingHours: 'Lun-Dom 10:00-23:00',
          phone: '+54 11 4000-0000',
          active: true,
        },
      });
    }

    const address = await request(server)
      .post('/api/me/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        street: 'Av. Rivadavia 5000, CABA',
        latitude: -34.61,
        longitude: -58.42,
        isDefault: true,
      });
    expect(address.status).toBe(201);

    const cart = await request(server)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        quantity: 2,
        notes: 'sin cebolla',
      });
    expect(cart.status).toBe(201);
    expect(cart.body.total).toBe(3000);

    const order = await request(server)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: address.body.id });

    expect(order.status).toBe(201);
    expect(order.body.status).toBe('pending');
    expect(order.body.totalAmount).toBe(3000);
    expect(order.body.branch.id).toBe(branch.id);
    expect(order.body.address.id).toBe(address.body.id);
    expect(order.body.items).toHaveLength(1);
    expect(order.body.items[0].quantity).toBe(2);
    expect(order.body.items[0].notes).toBe('sin cebolla');

    const emptyCart = await request(server)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(emptyCart.status).toBe(200);
    expect(emptyCart.body.items).toHaveLength(0);
  });

  it('POST /api/orders/guest happy path without login', async () => {
    const stamp = Date.now();
    const category = await prisma.category.upsert({
      where: { slug: 'e2e-test' },
      update: {},
      create: { name: 'E2E Test', slug: 'e2e-test' },
    });

    const product = await prisma.product.create({
      data: {
        name: `Burger Guest ${stamp}`,
        slug: `burger-guest-${stamp}`,
        description: 'Producto de prueba guest',
        price: new Prisma.Decimal('2000.00'),
        available: true,
        categories: { connect: { id: category.id } },
        images: { create: { url: 'https://example.com/guest-burger.png', sortOrder: 0 } },
      },
    });

    const order = await request(server).post('/api/orders/guest').send({
      name: 'Invitado E2E',
      email: `guest.e2e.${stamp}@rapido.local`,
      street: 'Av. Santa Fe 1200, CABA',
      latitude: -34.59,
      longitude: -58.39,
      items: [{ productId: product.id, quantity: 1, notes: 'sin ketchup' }],
    });

    expect(order.status).toBe(201);
    expect(order.body.status).toBe('pending');
    expect(order.body.totalAmount).toBe(2000);
    expect(order.body.guestName).toBe('Invitado E2E');
    expect(order.body.guestEmail).toBe(`guest.e2e.${stamp}@rapido.local`);
    expect(order.body.address.street).toBe('Av. Santa Fe 1200, CABA');
    expect(order.body.items).toHaveLength(1);
    expect(order.body.items[0].notes).toBe('sin ketchup');
  });
});
