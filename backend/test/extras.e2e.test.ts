import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

const stamp = Date.now();

let app: NestExpressApplication;
let server: ReturnType<NestExpressApplication['getHttpServer']>;
let prisma: PrismaService;

let token: string;
let userId: string;
let addressId: string;
let createdBranchId: string | undefined;
let burger: { id: string; name: string };
let bacon: { id: string; name: string };
let cheddar: { id: string; name: string };
let gone: { id: string; name: string };
let lower: { id: string; name: string };
let drink: { id: string; name: string };
let otherCategoryId: string;

const bearer = () => ({ Authorization: `Bearer ${token}` });

async function createProduct(name: string, price: string, categoryId: string, available = true) {
  return prisma.product.create({
    data: {
      name: `${name} ${stamp}`,
      slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${stamp}`,
      description: 'Producto de prueba',
      price: new Prisma.Decimal(price),
      available,
      categories: { connect: { id: categoryId } },
    },
    select: { id: true, name: true },
  });
}

function addToCart(body: object) {
  return request(server).post('/api/cart/items').set(bearer()).send(body);
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
    data: { name: `E2E Extras Otros ${stamp}`, slug: `e2e-extras-otros-${stamp}` },
  });
  otherCategoryId = other.id;

  burger = await createProduct('E2E Hamburguesa', '20000.00', hamburguesas.id);
  bacon = await createProduct('E2E Bacon', '2000.00', adicional.id);
  cheddar = await createProduct('E2E Cheddar', '1500.00', adicional.id);
  gone = await createProduct('E2E Agotado', '1000.00', adicional.id, false);
  lower = await createProduct('a-e2e minuscula', '500.00', adicional.id);
  drink = await createProduct('E2E Gaseosa', '1500.00', other.id);

  let branch = await prisma.branch.findFirst({ where: { active: true } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: `Sucursal E2E Extras ${stamp}`,
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

  const register = await request(server)
    .post('/api/auth/register')
    .send({ email: `extras.e2e.${stamp}@rapido.local`, name: 'Cliente Extras', password: 'Cliente123!' });
  expect(register.status).toBe(201);
  token = register.body.accessToken;
  userId = register.body.user.id;

  const address = await request(server)
    .post('/api/me/addresses')
    .set(bearer())
    .send({ street: 'Av. Rivadavia 5000, CABA', latitude: -34.61, longitude: -58.42, isDefault: true });
  expect(address.status).toBe(201);
  addressId = address.body.id;
}, 60_000);

beforeEach(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
  await prisma.product.updateMany({ where: { id: bacon.id }, data: { available: true, price: 2000 } });
});

afterAll(async () => {
  const productIds = [burger, bacon, cheddar, gone, lower, drink].map((product) => product.id);
  const orders = await prisma.order.findMany({
    where: { items: { some: { productId: { in: productIds } } } },
    select: { id: true, userId: true, addressId: true },
  });
  await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
  // Las direcciones de pedidos de invitado no cuelgan de un usuario: no se borran en cascada.
  const guestAddressIds = orders.filter((order) => !order.userId).map((order) => order.addressId);
  await prisma.address.deleteMany({ where: { id: { in: guestAddressIds } } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.category.deleteMany({ where: { id: otherCategoryId } });
  if (createdBranchId) {
    await prisma.branch.deleteMany({ where: { id: createdBranchId } });
  }
  await app.close();
});

describe('GET /api/products/:id', () => {
  it('lista los adicionales disponibles de una hamburguesa', async () => {
    const response = await request(server).get(`/api/products/${burger.id}`);

    expect(response.status).toBe(200);
    const extras = response.body.extras as { id: string; name: string; price: number }[];
    expect(extras).toEqual(
      expect.arrayContaining([
        { id: bacon.id, name: bacon.name, price: 2000 },
        { id: cheddar.id, name: cheddar.name, price: 1500 },
      ]),
    );
    expect(extras.map((extra) => extra.id)).not.toContain(gone.id);
    expect(extras.map((extra) => extra.id)).not.toContain(burger.id);
  });

  it('un producto que no es hamburguesa no ofrece adicionales', async () => {
    const response = await request(server).get(`/api/products/${drink.id}`);

    expect(response.status).toBe(200);
    expect(response.body.extras).toEqual([]);
  });
});

describe('orden de los adicionales', () => {
  it('es alfabético sin distinguir mayúsculas, igual en catálogo, carrito y pedido', async () => {
    // "a-e2e minuscula" empieza en minúscula: con el orden por defecto de Postgres quedaría último.
    const expected = [lower.id, bacon.id, cheddar.id];

    const detail = await request(server).get(`/api/products/${burger.id}`);
    const listed = (detail.body.extras as { id: string }[]).map((extra) => extra.id);
    expect(listed.filter((id) => expected.includes(id))).toEqual(expected);
    expect(listed[0]).toBe(lower.id);

    const cart = await addToCart({ productId: burger.id, quantity: 1, extraIds: [cheddar.id, lower.id, bacon.id] });
    expect(cart.body.items[0].extras.map((extra: { id: string }) => extra.id)).toEqual(expected);

    const order = await request(server).post('/api/orders').set(bearer()).send({ addressId });
    expect(order.status).toBe(201);
    expect(order.body.items[0].extras.map((extra: { id: string }) => extra.id)).toEqual(expected);
  });
});

describe('POST /api/cart/items con adicionales', () => {
  it('suma el recargo de los adicionales al subtotal y al total', async () => {
    const response = await addToCart({ productId: burger.id, quantity: 2, extraIds: [bacon.id, cheddar.id] });

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(1);
    const [item] = response.body.items;
    expect(item.unitPrice).toBe(20000);
    expect(item.extras).toEqual(
      expect.arrayContaining([
        { id: bacon.id, name: bacon.name, price: 2000, available: true },
        { id: cheddar.id, name: cheddar.name, price: 1500, available: true },
      ]),
    );
    expect(item.extrasTotal).toBe(3500);
    expect(item.subtotal).toBe((20000 + 3500) * 2);
    expect(response.body.total).toBe(47000);
    expect(response.body.itemCount).toBe(2);
  });

  it('la misma hamburguesa con los mismos adicionales, en otro orden, suma cantidad en la misma línea', async () => {
    await addToCart({ productId: burger.id, quantity: 1, extraIds: [bacon.id, cheddar.id] });
    const response = await addToCart({ productId: burger.id, quantity: 2, extraIds: [cheddar.id, bacon.id] });

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(3);
    expect(response.body.items[0].extras).toHaveLength(2);
  });

  it('con otros adicionales, o sin ninguno, es otra línea', async () => {
    await addToCart({ productId: burger.id, quantity: 1, extraIds: [bacon.id] });
    await addToCart({ productId: burger.id, quantity: 1, extraIds: [cheddar.id] });
    const response = await addToCart({ productId: burger.id, quantity: 1 });

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.total).toBe(22000 + 21500 + 20000);
  });

  it('sin adicionales sigue igual que antes: suma cantidad y actualiza observaciones', async () => {
    await addToCart({ productId: drink.id, quantity: 1, notes: 'sin hielo' });
    const response = await addToCart({ productId: drink.id, quantity: 2 });

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(1);
    const [item] = response.body.items;
    expect(item.quantity).toBe(3);
    expect(item.notes).toBe('sin hielo');
    expect(item.extras).toEqual([]);
    expect(item.extrasTotal).toBe(0);
    expect(item.subtotal).toBe(1500 * 3);
  });

  it.each([
    ['un producto que no admite adicionales', () => ({ productId: drink.id, quantity: 1, extraIds: [bacon.id] }), 'no admite adicionales'],
    ['un adicional que no existe', () => ({ productId: burger.id, quantity: 1, extraIds: ['no-existe'] }), 'Adicional no encontrado'],
    ['un producto que no es un adicional', () => ({ productId: burger.id, quantity: 1, extraIds: [drink.id] }), 'no es un adicional'],
    ['un adicional no disponible', () => ({ productId: burger.id, quantity: 1, extraIds: [gone.id] }), 'no está disponible'],
  ])('rechaza %s con 400', async (_label, body, message) => {
    const response = await addToCart(body());

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain(message);
  });

  it('rechaza adicionales repetidos y más de 10 por línea', async () => {
    const repeated = await addToCart({ productId: burger.id, quantity: 1, extraIds: [bacon.id, bacon.id] });
    expect(repeated.status).toBe(400);

    const tooMany = await addToCart({
      productId: burger.id,
      quantity: 1,
      extraIds: Array.from({ length: 11 }, (_, index) => `extra-${index}`),
    });
    expect(tooMany.status).toBe(400);
  });

  it('cambiar la cantidad conserva los adicionales y recalcula el subtotal', async () => {
    const added = await addToCart({ productId: burger.id, quantity: 1, extraIds: [bacon.id] });
    const itemId = added.body.items[0].id as string;

    const response = await request(server)
      .patch(`/api/cart/items/${itemId}`)
      .set(bearer())
      .send({ quantity: 4 });

    expect(response.status).toBe(200);
    const [item] = response.body.items;
    expect(item.extras.map((extra: { id: string }) => extra.id)).toEqual([bacon.id]);
    expect(item.subtotal).toBe((20000 + 2000) * 4);
  });

  it('quitar la línea también quita sus adicionales', async () => {
    const added = await addToCart({ productId: burger.id, quantity: 1, extraIds: [bacon.id, cheddar.id] });
    const itemId = added.body.items[0].id as string;
    expect(await prisma.cartItemExtra.count({ where: { cartItemId: itemId } })).toBe(2);

    const response = await request(server).delete(`/api/cart/items/${itemId}`).set(bearer());

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(0);
    expect(await prisma.cartItemExtra.count({ where: { cartItemId: itemId } })).toBe(0);
  });
});

describe('POST /api/orders con adicionales', () => {
  it('guarda el detalle, congela nombre y precio del adicional y suma todo al total', async () => {
    await addToCart({ productId: burger.id, quantity: 2, extraIds: [bacon.id, cheddar.id], notes: 'bien cocida' });
    await addToCart({ productId: drink.id, quantity: 1 });

    const response = await request(server).post('/api/orders').set(bearer()).send({ addressId });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('pending');
    expect(response.body.totalAmount).toBe(47000 + 1500);
    const burgerLine = response.body.items.find((item: { productId: string }) => item.productId === burger.id);
    expect(burgerLine.unitPrice).toBe(20000);
    expect(burgerLine.extras).toEqual(
      expect.arrayContaining([
        { id: bacon.id, name: bacon.name, price: 2000 },
        { id: cheddar.id, name: cheddar.name, price: 1500 },
      ]),
    );
    expect(burgerLine.extrasTotal).toBe(3500);
    expect(burgerLine.subtotal).toBe(47000);
    const drinkLine = response.body.items.find((item: { productId: string }) => item.productId === drink.id);
    expect(drinkLine.extras).toEqual([]);

    // El carrito queda vacío y sin adicionales huérfanos.
    const cart = await request(server).get('/api/cart').set(bearer());
    expect(cart.body.items).toHaveLength(0);

    // El precio congelado no se mueve si el adicional cambia después.
    await prisma.product.update({ where: { id: bacon.id }, data: { price: 9999 } });
    const stored = await prisma.orderItemExtra.findMany({
      where: { orderItem: { orderId: response.body.id }, extraId: bacon.id },
    });
    expect(stored.map((row) => Number(row.price))).toEqual([2000]);
  });

  it('no confirma si un adicional del carrito dejó de estar disponible', async () => {
    await addToCart({ productId: burger.id, quantity: 1, extraIds: [bacon.id] });
    await prisma.product.update({ where: { id: bacon.id }, data: { available: false } });

    const response = await request(server).post('/api/orders').set(bearer()).send({ addressId });

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain(`"${bacon.name}" ya no está disponible`);
  });
});

describe('POST /api/orders/guest con adicionales', () => {
  const guest = (items: object[]) => ({
    name: 'Invitado Extras',
    email: `guest.extras.${stamp}@rapido.local`,
    street: 'Av. Santa Fe 1200, CABA',
    latitude: -34.59,
    longitude: -58.39,
    items,
  });

  it('acepta adicionales por línea y los suma al total', async () => {
    const response = await request(server)
      .post('/api/orders/guest')
      .send(
        guest([
          { productId: burger.id, quantity: 1, extraIds: [bacon.id] },
          { productId: drink.id, quantity: 2 },
        ]),
      );

    expect(response.status).toBe(201);
    expect(response.body.totalAmount).toBe(22000 + 3000);
    const burgerLine = response.body.items.find((item: { productId: string }) => item.productId === burger.id);
    expect(burgerLine.extras).toEqual([{ id: bacon.id, name: bacon.name, price: 2000 }]);
    expect(burgerLine.subtotal).toBe(22000);
  });

  it('rechaza adicionales inválidos con 400', async () => {
    const response = await request(server)
      .post('/api/orders/guest')
      .send(guest([{ productId: drink.id, quantity: 1, extraIds: [bacon.id] }]));

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('no admite adicionales');
  });
});
