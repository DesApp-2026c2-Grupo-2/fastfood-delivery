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

let productPending: { id: string; name: string };
let productCancelled: { id: string; name: string };
let productOutOfStock: { id: string; name: string };
let categoryId: string;
let branchId: string;
let createdBranchId: string | undefined;

let pendingOrderId: string;
let cancelledOrderId: string;

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

  // 1. Categoría de prueba
  const category = await prisma.category.create({
    data: { name: `Reportes Cat ${stamp}`, slug: `reportes-cat-${stamp}` },
  });
  categoryId = category.id;

  // 2. Productos
  productPending = await createProduct('Reporte Prod Pending', '1000.00');
  productCancelled = await createProduct('Reporte Prod Cancelled', '2000.00');
  productOutOfStock = await createProduct('Reporte Prod Sin Stock', '500.00');

  // 3. Sucursal
  let branch = await prisma.branch.findFirst({ where: { active: true } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: `Sucursal E2E Reportes ${stamp}`,
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
  branchId = branch.id;

  // Stock para los productos (el outOfStock lo dejamos en 0)
  await prisma.stock.createMany({
    data: [
      { branchId, productId: productPending.id, available: 50 },
      { branchId, productId: productCancelled.id, available: 50 },
      { branchId, productId: productOutOfStock.id, available: 0 },
    ],
  });

  // 4. Crear un pedido PENDING con productPending (cantidad 3)
  const pendingOrder = await prisma.order.create({
    data: {
      branchId,
      status: OrderStatus.pending,
      fulfillment: 'pickup',
      totalAmount: new Prisma.Decimal('3000.00'),
      subtotal: new Prisma.Decimal('3000.00'),
      estimatedDeliveryAt: new Date(Date.now() + 3600000),
      items: {
        create: [
          {
            productId: productPending.id,
            quantity: 3,
            unitPrice: new Prisma.Decimal('1000.00'),
          },
        ],
      },
    },
  });
  pendingOrderId = pendingOrder.id;

  // 5. Crear un pedido CANCELLED con productCancelled (cantidad 5)
  const cancelledOrder = await prisma.order.create({
    data: {
      branchId,
      status: OrderStatus.cancelled,
      fulfillment: 'pickup',
      totalAmount: new Prisma.Decimal('10000.00'),
      subtotal: new Prisma.Decimal('10000.00'),
      estimatedDeliveryAt: new Date(Date.now() + 3600000),
      items: {
        create: [
          {
            productId: productCancelled.id,
            quantity: 5,
            unitPrice: new Prisma.Decimal('2000.00'),
          },
        ],
      },
    },
  });
  cancelledOrderId = cancelledOrder.id;
}, 60_000);

afterAll(async () => {
  // Limpieza de datos creados en el test
  await prisma.orderItem.deleteMany({
    where: { orderId: { in: [pendingOrderId, cancelledOrderId] } },
  });
  await prisma.order.deleteMany({
    where: { id: { in: [pendingOrderId, cancelledOrderId] } },
  });
  await prisma.stock.deleteMany({
    where: {
      productId: { in: [productPending.id, productCancelled.id, productOutOfStock.id] },
    },
  });
  await prisma.product.deleteMany({
    where: {
      id: { in: [productPending.id, productCancelled.id, productOutOfStock.id] },
    },
  });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  if (createdBranchId) {
    await prisma.branch.deleteMany({ where: { id: createdBranchId } });
  }
  await app.close();
});

describe('GET /api/admin/reports/products', () => {
  it('un pedido pending sí suma a los reportes y un pedido cancelado NO suma', async () => {
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(login.status).toBe(201);

    const response = await request(server)
      .get('/api/admin/reports/products')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(response.status).toBe(200);

    const { topSelling, topRevenue, outOfStock } = response.body;

    // 1. El producto del pedido PENDING sí suma unidades vendidas y facturación
    const pendingInTop = topSelling.find((p: { id: string }) => p.id === productPending.id);
    expect(pendingInTop).toBeDefined();
    expect(pendingInTop.unitsSold).toBe(3);

    const pendingInRevenue = topRevenue.find((p: { id: string }) => p.id === productPending.id);
    expect(pendingInRevenue).toBeDefined();
    expect(pendingInRevenue.totalRevenue).toBe(3000);

    // 2. El producto del pedido CANCELLED NO suma unidades ni facturación
    const cancelledInTop = topSelling.find((p: { id: string }) => p.id === productCancelled.id);
    expect(cancelledInTop).toBeUndefined();

    const cancelledInRevenue = topRevenue.find((p: { id: string }) => p.id === productCancelled.id);
    expect(cancelledInRevenue).toBeUndefined();

    const outStockFound = outOfStock.find((p: { name: string }) => p.name.includes(productOutOfStock.name));
    expect(outStockFound).toBeDefined();
    expect(outStockFound.stock).toBe(0);
  });
});