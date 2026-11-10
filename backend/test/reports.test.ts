import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { OrderStatus, Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const stamp = Date.now();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;
let adminToken: string;

let productPending: { id: string; name: string };
let productCancelled: { id: string; name: string };
let productOutOfStock: { id: string; name: string };
let productFilter: { id: string; name: string };
let categoryId: string;
let branchAId: string;
let branchBId: string;
let createdBranchIds: string[] = [];
let customerId: string;
let createdCustomer = false;

const orderIds: string[] = [];

async function createProduct(name: string, price: string, available = true) {
  return prisma.product.create({
    data: {
      name: `${name} ${stamp}`,
      slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${stamp}`,
      description: 'Producto para test de reportes',
      price: new Prisma.Decimal(price),
      available,
      categories: { connect: { id: categoryId } },
    },
    select: { id: true, name: true },
  });
}

async function createBranch(name: string) {
  const branch = await prisma.branch.create({
    data: {
      name: `${name} ${stamp}`,
      address: 'Av. Corrientes 1234, CABA',
      latitude: -34.6037,
      longitude: -58.3816,
      openingHours: 'Lun-Dom 10:00-23:00',
      phone: '+54 11 4000-0000',
      active: true,
    },
  });
  createdBranchIds.push(branch.id);
  return branch;
}

async function createOrder(opts: {
  branchId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  status: OrderStatus;
  createdAt: Date;
  userId?: string;
  promotionName?: string;
  discountAmount?: string;
  totalAmount?: string;
  confirmedAt?: Date;
  deliveredAt?: Date;
}) {
  const subtotal = Number(opts.unitPrice) * opts.quantity;
  const discount = Number(opts.discountAmount ?? '0');
  const total = opts.totalAmount ?? String(subtotal - discount);
  const order = await prisma.order.create({
    data: {
      branchId: opts.branchId,
      userId: opts.userId,
      status: opts.status,
      fulfillment: 'pickup',
      totalAmount: new Prisma.Decimal(total),
      subtotal: new Prisma.Decimal(String(subtotal)),
      discountAmount: new Prisma.Decimal(opts.discountAmount ?? '0'),
      promotionName: opts.promotionName,
      estimatedDeliveryAt: new Date(opts.createdAt.getTime() + 3600000),
      createdAt: opts.createdAt,
      items: {
        create: [
          {
            productId: opts.productId,
            quantity: opts.quantity,
            unitPrice: new Prisma.Decimal(opts.unitPrice),
          },
        ],
      },
    },
  });
  orderIds.push(order.id);

  if (opts.confirmedAt) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: OrderStatus.confirmed,
        changedAt: opts.confirmedAt,
      },
    });
  }
  if (opts.deliveredAt) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: OrderStatus.delivered,
        changedAt: opts.deliveredAt,
      },
    });
  }

  return order;
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

  const login = await request(server)
    .post('/api/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(login.status).toBe(201);
  adminToken = login.body.accessToken;

  const category = await prisma.category.create({
    data: { name: `Reportes Cat ${stamp}`, slug: `reportes-cat-${stamp}` },
  });
  categoryId = category.id;

  productPending = await createProduct('Reporte Prod Pending', '1000.00');
  productCancelled = await createProduct('Reporte Prod Cancelled', '2000.00');
  productOutOfStock = await createProduct('Reporte Prod Sin Stock', '500.00');
  productFilter = await createProduct('Reporte Prod Filtro', '1500.00');

  const branchA = await createBranch('Sucursal Reportes A');
  const branchB = await createBranch('Sucursal Reportes B');
  branchAId = branchA.id;
  branchBId = branchB.id;

  await prisma.stock.createMany({
    data: [
      { branchId: branchAId, productId: productPending.id, available: 50 },
      { branchId: branchAId, productId: productCancelled.id, available: 50 },
      { branchId: branchAId, productId: productOutOfStock.id, available: 0 },
      { branchId: branchBId, productId: productOutOfStock.id, available: 0 },
      { branchId: branchAId, productId: productFilter.id, available: 20 },
      { branchId: branchBId, productId: productFilter.id, available: 20 },
    ],
  });

  let customer = await prisma.user.findFirst({ where: { role: 'customer', active: true } });
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        email: `reportes-cliente-${stamp}@test.local`,
        name: `Cliente Reportes ${stamp}`,
        passwordHash: 'x',
        role: 'customer',
        active: true,
      },
    });
    createdCustomer = true;
  }
  customerId = customer.id;

  // Pedido pending (suma en productos) y cancelado (no suma)
  await createOrder({
    branchId: branchAId,
    productId: productPending.id,
    quantity: 3,
    unitPrice: '1000.00',
    status: OrderStatus.pending,
    createdAt: new Date(),
  });
  await createOrder({
    branchId: branchAId,
    productId: productCancelled.id,
    quantity: 5,
    unitPrice: '2000.00',
    status: OrderStatus.cancelled,
    createdAt: new Date(),
  });

  // Filtro por fecha: 10/11 dentro, 01/11 fuera
  await createOrder({
    branchId: branchAId,
    productId: productFilter.id,
    quantity: 2,
    unitPrice: '1500.00',
    status: OrderStatus.confirmed,
    createdAt: new Date('2026-11-10T15:00:00.000-03:00'),
    userId: customerId,
    promotionName: 'Premio Fidelidad',
    discountAmount: '300.00',
    totalAmount: '2700.00',
  });
  await createOrder({
    branchId: branchAId,
    productId: productFilter.id,
    quantity: 4,
    unitPrice: '1500.00',
    status: OrderStatus.confirmed,
    createdAt: new Date('2026-11-01T12:00:00.000-03:00'),
    userId: customerId,
  });

  // Filtro por sucursal: branch B
  await createOrder({
    branchId: branchBId,
    productId: productFilter.id,
    quantity: 1,
    unitPrice: '1500.00',
    status: OrderStatus.pending,
    createdAt: new Date('2026-11-10T18:00:00.000-03:00'),
  });

  // Tiempo promedio: 30 min y 50 min → 40
  await createOrder({
    branchId: branchAId,
    productId: productFilter.id,
    quantity: 1,
    unitPrice: '1500.00',
    status: OrderStatus.delivered,
    createdAt: new Date('2026-11-10T10:00:00.000-03:00'),
    userId: customerId,
    confirmedAt: new Date('2026-11-10T10:05:00.000-03:00'),
    deliveredAt: new Date('2026-11-10T10:35:00.000-03:00'),
  });
  await createOrder({
    branchId: branchAId,
    productId: productFilter.id,
    quantity: 1,
    unitPrice: '1500.00',
    status: OrderStatus.delivered,
    createdAt: new Date('2026-11-10T11:00:00.000-03:00'),
    userId: customerId,
    confirmedAt: new Date('2026-11-10T11:10:00.000-03:00'),
    deliveredAt: new Date('2026-11-10T12:00:00.000-03:00'),
  });
}, 60_000);

afterAll(async () => {
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.stock.deleteMany({
    where: {
      productId: {
        in: [productPending.id, productCancelled.id, productOutOfStock.id, productFilter.id],
      },
    },
  });
  await prisma.product.deleteMany({
    where: {
      id: { in: [productPending.id, productCancelled.id, productOutOfStock.id, productFilter.id] },
    },
  });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  if (createdBranchIds.length > 0) {
    await prisma.branch.deleteMany({ where: { id: { in: createdBranchIds } } });
  }
  if (createdCustomer) {
    await prisma.user.deleteMany({ where: { id: customerId } });
  }
  await app.close();
});

describe('GET /api/admin/reports/products', () => {
  it('un pedido pending sí suma y un cancelado no suma', async () => {
    const response = await request(server)
      .get('/api/admin/reports/products')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const { topSelling, topRevenue, outOfStock } = response.body;

    const pendingInTop = topSelling.find((p: { id: string }) => p.id === productPending.id);
    expect(pendingInTop).toBeDefined();
    expect(pendingInTop.unitsSold).toBe(3);

    const pendingInRevenue = topRevenue.find((p: { id: string }) => p.id === productPending.id);
    expect(pendingInRevenue).toBeDefined();
    expect(pendingInRevenue.totalRevenue).toBe(3000);

    expect(topSelling.find((p: { id: string }) => p.id === productCancelled.id)).toBeUndefined();
    expect(topRevenue.find((p: { id: string }) => p.id === productCancelled.id)).toBeUndefined();

    const outStockFound = outOfStock.find((p: { name: string }) => p.name.includes(productOutOfStock.name));
    expect(outStockFound).toBeDefined();
    expect(outStockFound.stock).toBe(0);
  });

  it('un pedido de otro día queda fuera del filtro de fechas', async () => {
    const response = await request(server)
      .get('/api/admin/reports/products')
      .query({ from: '2026-11-10', to: '2026-11-10' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const filterRow = response.body.topSelling.find((p: { id: string }) => p.id === productFilter.id);
    expect(filterRow).toBeDefined();
    // 2 (10/11) + 1 (branch B 10/11) + 1 + 1 (delivered) = 5; el de 01/11 (qty 4) no entra
    expect(filterRow.unitsSold).toBe(5);
  });

  it('sin stock respeta la sucursal y no las fechas', async () => {
    const response = await request(server)
      .get('/api/admin/reports/products')
      .query({ from: '2099-01-01', to: '2099-01-02', branchId: branchBId })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.topSelling).toEqual([]);
    const out = response.body.outOfStock.filter((p: { name: string }) =>
      p.name.includes(productOutOfStock.name),
    );
    expect(out).toHaveLength(1);
    expect(out[0].branchName).toContain('Sucursal Reportes B');
  });
});

describe('GET /api/admin/reports/orders', () => {
  it('un pedido de otra sucursal queda fuera del filtro', async () => {
    const response = await request(server)
      .get('/api/admin/reports/orders')
      .query({ from: '2026-11-10', to: '2026-11-10', branchId: branchBId })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.ordersByBranch).toEqual([
      expect.objectContaining({ branchId: branchBId, count: 1 }),
    ]);
    expect(response.body.salesByBranch).toEqual([
      expect.objectContaining({ branchId: branchBId, totalAmount: 1500 }),
    ]);
    expect(response.body.productsByBranch).toEqual([
      expect.objectContaining({
        branchId: branchBId,
        productId: productFilter.id,
        unitsSold: 1,
      }),
    ]);
  });

  it('el tiempo promedio se calcula con dos pedidos entregados', async () => {
    const response = await request(server)
      .get('/api/admin/reports/orders')
      .query({ from: '2026-11-10', to: '2026-11-10', branchId: branchAId })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    // 30 min y 50 min → 40
    expect(response.body.averageDeliveryMinutes).toBe(40);
  });

  it('incluye cancelados, top clientes y promociones con el nombre guardado', async () => {
    const response = await request(server)
      .get('/api/admin/reports/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.cancelled.count).toBeGreaterThanOrEqual(1);
    expect(response.body.cancelled.percent).toBeGreaterThan(0);

    const customer = response.body.topCustomers.find((c: { userId: string }) => c.userId === customerId);
    expect(customer).toBeDefined();
    expect(customer.orderCount).toBeGreaterThanOrEqual(4);

    const promo = response.body.topPromotions.find(
      (p: { promotionName: string }) => p.promotionName === 'Premio Fidelidad',
    );
    expect(promo).toBeDefined();
    expect(promo.orderCount).toBe(1);
    expect(promo.totalDiscount).toBe(300);
  });
});
