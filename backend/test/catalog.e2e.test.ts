import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';
const stamp = Date.now();

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;
let adminToken: string;
let customerToken: string;
let categoryId: string;

const productIds: string[] = [];
const categoryIds: string[] = [];

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function productBody(overrides: Record<string, unknown> = {}) {
  return {
    name: `Milanesa E2E ${stamp}`,
    description: 'Con papas',
    price: 4500,
    available: true,
    categoryIds: [categoryId],
    imageUrls: ['/uploads/milanesa.png', 'https://cdn.example.com/milanesa.jpg'],
    ...overrides,
  };
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

  const login = await request(server).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(login.status).toBe(201);
  adminToken = login.body.accessToken;

  const customer = await request(server).post('/api/auth/register').send({
    email: `catalog.e2e.${stamp}@rapido.local`,
    name: `Cliente catálogo ${stamp}`,
    password: 'Cliente123!',
  });
  expect(customer.status).toBe(201);
  customerToken = customer.body.accessToken;

  const category = await request(server)
    .post('/api/admin/categories')
    .set(auth(adminToken))
    .send({ name: `Catálogo E2E ${stamp}` });
  expect(category.status).toBe(201);
  categoryId = category.body.id;
  categoryIds.push(categoryId);
}, 60_000);

afterAll(async () => {
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
  await prisma.user.deleteMany({ where: { email: `catalog.e2e.${stamp}@rapido.local` } });
  await app.close();
});

describe('Categorías', () => {
  it('el alta arma el slug, el listado público la muestra y el admin ve cuántos productos tiene', async () => {
    const created = await request(server)
      .post('/api/admin/categories')
      .set(auth(adminToken))
      .send({ name: `Milanesa Napolitána ${stamp}` });

    expect(created.status).toBe(201);
    expect(created.body.slug).toBe(`milanesa-napolitana-${stamp}`);
    categoryIds.push(created.body.id);

    const listed = await request(server).get('/api/categories');
    expect(listed.status).toBe(200);
    expect(listed.body.some((category: { id: string }) => category.id === created.body.id)).toBe(true);

    const detail = await request(server).get(`/api/categories/${created.body.id}`);
    expect(detail.body).toMatchObject({ id: created.body.id, name: `Milanesa Napolitána ${stamp}` });

    const adminDetail = await request(server).get(`/api/admin/categories/${created.body.id}`).set(auth(adminToken));
    expect(adminDetail.body._count.products).toBe(0);
  });

  it('un slug propio se respeta, uno vacío en la edición se ignora y uno ilegible se rechaza', async () => {
    const custom = await request(server)
      .post('/api/admin/categories')
      .set(auth(adminToken))
      .send({ name: `Guarnición ${stamp}`, slug: `guarnicion-e2e-${stamp}` });
    expect(custom.status).toBe(201);
    expect(custom.body.slug).toBe(`guarnicion-e2e-${stamp}`);
    categoryIds.push(custom.body.id);

    const blank = await request(server)
      .patch(`/api/admin/categories/${custom.body.id}`)
      .set(auth(adminToken))
      .send({ slug: '' });
    // Un slug vacío en la edición se ignora: queda el que ya tenía.
    expect(blank.status).toBe(200);
    expect(blank.body.slug).toBe(`guarnicion-e2e-${stamp}`);

    const empty = await request(server)
      .post('/api/admin/categories')
      .set(auth(adminToken))
      .send({ name: '???' });
    expect(empty.status).toBe(400);
  });

  it('no se puede repetir el slug, borrar una categoría con productos ni pedir una que no existe', async () => {
    const first = await request(server)
      .post('/api/admin/categories')
      .set(auth(adminToken))
      .send({ name: `Postres ${stamp}`, slug: `postres-e2e-${stamp}` });
    expect(first.status).toBe(201);
    categoryIds.push(first.body.id);

    const repeated = await request(server)
      .post('/api/admin/categories')
      .set(auth(adminToken))
      .send({ name: `Postres otra ${stamp}`, slug: `postres-e2e-${stamp}` });
    expect(repeated.status).toBe(409);

    const product = await request(server).post('/api/admin/products').set(auth(adminToken)).send(
      productBody({
        name: `Flan E2E ${stamp}`,
        categoryIds: [first.body.id],
        imageUrls: ['/uploads/flan.png'],
      }),
    );
    expect(product.status).toBe(201);
    productIds.push(product.body.id);

    const blocked = await request(server).delete(`/api/admin/categories/${first.body.id}`).set(auth(adminToken));
    expect(blocked.status).toBe(409);

    expect((await request(server).get('/api/admin/categories/no-existe').set(auth(adminToken))).status).toBe(404);
    expect((await request(server).delete('/api/admin/categories/no-existe').set(auth(adminToken))).status).toBe(404);
  });

  it('una categoría vacía se borra; un cliente no administra el catálogo', async () => {
    const created = await request(server)
      .post('/api/admin/categories')
      .set(auth(adminToken))
      .send({ name: `Bebidas E2E ${stamp}` });
    expect(created.status).toBe(201);

    const removed = await request(server).delete(`/api/admin/categories/${created.body.id}`).set(auth(adminToken));
    expect(removed.body).toEqual({ id: created.body.id });

    expect(
      (await request(server).post('/api/admin/categories').set(auth(customerToken)).send({ name: 'No' })).status,
    ).toBe(403);
    expect((await request(server).post('/api/admin/categories').send({ name: 'No' })).status).toBe(401);
  });
});

describe('Productos', () => {
  it('el alta guarda imágenes y precio, y el público no ve los que están desactivados', async () => {
    const created = await request(server).post('/api/admin/products').set(auth(adminToken)).send(productBody());
    expect(created.status).toBe(201);
    productIds.push(created.body.id);
    expect(created.body).toMatchObject({
      name: `Milanesa E2E ${stamp}`,
      slug: `milanesa-e2e-${stamp}`,
      price: 4500,
      imageUrl: '/uploads/milanesa.png',
      available: true,
      categoryId,
    });
    expect(created.body.images).toHaveLength(2);

    const hidden = await request(server)
      .post('/api/admin/products')
      .set(auth(adminToken))
      .send(productBody({ name: `Oculta E2E ${stamp}`, available: false, imageUrls: ['/uploads/oculta.png'] }));
    expect(hidden.status).toBe(201);
    productIds.push(hidden.body.id);

    const pub = await request(server).get('/api/products').query({ categoryId });
    const ids = pub.body.map((product: { id: string }) => product.id);
    expect(ids).toContain(created.body.id);
    expect(ids).not.toContain(hidden.body.id);

    const adminList = await request(server).get('/api/admin/products').query({ categoryId }).set(auth(adminToken));
    expect(adminList.body.map((product: { id: string }) => product.id)).toEqual(
      expect.arrayContaining([created.body.id, hidden.body.id]),
    );

    const detail = await request(server).get(`/api/products/${created.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.price).toBe(4500);
    expect((await request(server).get('/api/products/no-existe')).status).toBe(404);
    expect((await request(server).get(`/api/products/${hidden.body.id}`)).status).toBe(404);
    expect((await request(server).get(`/api/products/${hidden.body.id}/extras`)).status).toBe(404);
  });

  it('editar cambia precio e imágenes; un slug repetido o una imagen inválida no se guardan', async () => {
    const created = await request(server)
      .post('/api/admin/products')
      .set(auth(adminToken))
      .send(productBody({ name: `Pizza E2E ${stamp}`, slug: '', imageUrls: ['/uploads/pizza.png'] }));
    expect(created.status).toBe(201);
    productIds.push(created.body.id);
    expect(created.body.slug).toBe(`pizza-e2e-${stamp}`);

    const other = await request(server)
      .post('/api/admin/products')
      .set(auth(adminToken))
      .send(productBody({ name: `Faina E2E ${stamp}`, imageUrls: ['/uploads/faina.png'] }));
    expect(other.status).toBe(201);
    productIds.push(other.body.id);

    const updated = await request(server)
      .patch(`/api/admin/products/${created.body.id}`)
      .set(auth(adminToken))
      .send({ price: 5200, imageUrls: ['https://cdn.example.com/pizza.webp'], description: 'Sin aceitunas' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      price: 5200,
      imageUrl: 'https://cdn.example.com/pizza.webp',
      description: 'Sin aceitunas',
    });
    expect(updated.body.images).toHaveLength(1);

    const collision = await request(server)
      .patch(`/api/admin/products/${created.body.id}`)
      .set(auth(adminToken))
      .send({ slug: other.body.slug });
    expect(collision.status).toBe(409);

    const badImage = await request(server)
      .post('/api/admin/products')
      .set(auth(adminToken))
      .send(productBody({ name: `Rota E2E ${stamp}`, imageUrls: ['notaurl'] }));
    expect(badImage.status).toBe(400);

    const ftp = await request(server)
      .post('/api/admin/products')
      .set(auth(adminToken))
      .send(productBody({ name: `Ftp E2E ${stamp}`, imageUrls: ['ftp://archivos.example.com/foto.jpg'] }));
    expect(ftp.status).toBe(400);

    const blankCategory = await request(server)
      .post('/api/admin/products')
      .set(auth(adminToken))
      .send(productBody({ name: `Sin categoria ${stamp}`, categoryIds: ['   '] }));
    expect(blankCategory.status).toBe(400);

    expect((await request(server).get('/api/admin/products/no-existe').set(auth(adminToken))).status).toBe(404);
    expect(
      (await request(server).patch('/api/admin/products/no-existe').set(auth(adminToken)).send({ price: 1 })).status,
    ).toBe(404);
  });

  it('borrar un producto que no está en pedidos lo saca del catálogo', async () => {
    const created = await request(server)
      .post('/api/admin/products')
      .set(auth(adminToken))
      .send(productBody({ name: `Para borrar ${stamp}`, imageUrls: ['/uploads/borrar.png'] }));
    expect(created.status).toBe(201);

    const removed = await request(server).delete(`/api/admin/products/${created.body.id}`).set(auth(adminToken));
    expect(removed.body).toEqual({ id: created.body.id });
    expect((await request(server).get(`/api/admin/products/${created.body.id}`).set(auth(adminToken))).status).toBe(404);
    expect((await request(server).delete('/api/admin/products/no-existe').set(auth(adminToken))).status).toBe(404);
  });
});

describe('Imágenes y salud de la API', () => {
  it('un admin sube un png y rechaza un archivo que no es imagen o un envío vacío', async () => {
    const uploaded = await request(server)
      .post('/api/admin/uploads')
      .set(auth(adminToken))
      .attach('files', PNG, { filename: 'punto.png', contentType: 'image/png' });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.urls[0]).toMatch(/^\/uploads\/.+\.png$/);

    const renamed = await request(server)
      .post('/api/admin/uploads')
      .set(auth(adminToken))
      .attach('files', PNG, { filename: 'sin-extension', contentType: 'image/png' });
    expect(renamed.status).toBe(201);
    expect(renamed.body.urls[0]).toMatch(/\.jpg$/);

    const text = await request(server)
      .post('/api/admin/uploads')
      .set(auth(adminToken))
      .attach('files', Buffer.from('hola'), { filename: 'nota.txt', contentType: 'text/plain' });
    expect(text.status).toBe(400);

    const empty = await request(server).post('/api/admin/uploads').set(auth(adminToken));
    expect(empty.status).toBe(400);

    expect((await request(server).post('/api/admin/uploads').set(auth(customerToken))).status).toBe(403);
  });

  it('la raíz y /health responden que la API está viva', async () => {
    expect((await request(server).get('/api')).body).toEqual({ ok: true, service: 'mordi-api' });
    expect((await request(server).get('/api/health')).body).toEqual({ ok: true });
  });
});
