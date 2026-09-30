import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_BRANCH = {
  name: 'Mordi Centro',
  address: 'Av. Corrientes 1234, CABA',
  latitude: -34.6037,
  longitude: -58.3816,
  openingHours: 'Lun-Dom 10:00-23:00',
  phone: '+54 11 4000-0000',
  active: true,
};

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@rapido.local';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin123!';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.admin, name: 'Administrador' },
    create: {
      email,
      passwordHash,
      role: Role.admin,
      name: 'Administrador',
    },
  });

  console.log(`Admin seed listo: ${email}`);

  const testCustomerId = 'test-customer-cart-0001';
  await prisma.user.upsert({
    where: { id: testCustomerId },
    update: {},
    create: {
      id: testCustomerId,
      email: 'test-customer@rapido.local',
      passwordHash: await bcrypt.hash('Test123!', 10),
      role: Role.customer,
      name: 'Cliente de prueba',
    },
  });

  console.log(`Cliente de prueba seed listo: ${testCustomerId}`);

  const existingBranch = await prisma.branch.findFirst({
    where: { name: DEFAULT_BRANCH.name },
  });

  if (!existingBranch) {
    await prisma.branch.create({ data: DEFAULT_BRANCH });
    console.log(`Sucursal seed listo: ${DEFAULT_BRANCH.name}`);
  } else {
    console.log(`Sucursal seed ya existe: ${DEFAULT_BRANCH.name}`);
  }

  await prisma.category.upsert({
    where: { slug: 'guarnicion' },
    update: {},
    create: { name: 'Guarnición', slug: 'guarnicion' },
  });

  await prisma.category.upsert({
    where: { slug: 'hamburguesas' },
    update: {},
    create: { name: 'Hamburguesas', slug: 'hamburguesas' },
  });

  await prisma.category.upsert({
    where: { slug: 'ensaladas' },
    update: {},
    create: { name: 'Ensaladas', slug: 'ensaladas' },
  });

  await prisma.category.upsert({
    where: { slug: 'bebidas' },
    update: {},
    create: { name: 'Bebidas', slug: 'bebidas' },
  });

  await prisma.category.upsert({
    where: { slug: 'aderezos' },
    update: {},
    create: { name: 'Aderezos', slug: 'aderezos' },
  });

  await prisma.category.upsert({
    where: { slug: 'adicional' },
    update: {},
    create: { name: 'Adicional', slug: 'adicional' },
  });

  const productosDemo: Array<{
    name: string;
    slug: string;
    description: string;
    price: number;
    available: boolean;
    categorySlug: string;
    imageUrl?: string;
  }> = [
    {
      name: 'Aros de cebolla',
      slug: 'aros-de-cebolla',
      description: 'Aros de cebolla crujientes con dip.',
      imageUrl: 'https://i.imgur.com/Ayl9jil.png',
      price: 2000,
      available: true,
      categorySlug: 'guarnicion',
    },
    {
      name: 'Papas fritas',
      slug: 'papas-fritas',
      description: 'Porción clásica de papas crocantes.',
      imageUrl: 'https://i.imgur.com/tNv8viS.png',
      price: 3000,
      available: true,
      categorySlug: 'guarnicion',
    },
    {
      name: 'Bastoncitos de muzzarella',
      slug: 'bastoncitos-de-muzzarella',
      description: 'Porción de 6 bastoncitos de muzzarella.',
      imageUrl: 'https://i.imgur.com/bcKv4pI.png',
      price: 3000,
      available: true,
      categorySlug: 'guarnicion',
    },
    {
      name: 'Hamburguesa simple',
      slug: 'hamburguesa-simple',
      description: 'Un medallón de carne vacuna',
      imageUrl: 'https://i.imgur.com/PpKzGf2.png',
      price: 15000,
      available: true,
      categorySlug: 'hamburguesas',
    },
    {
      name: 'Hamburguesa doble',
      slug: 'hamburguesa-doble',
      description: 'Dos medallones de carne vacuna',
      imageUrl: 'https://i.imgur.com/IyFMXgD.png',
      price: 20000,
      available: true,
      categorySlug: 'hamburguesas',
    },
    {
      name: 'Hamburguesa triple',
      slug: 'hamburguesa-triple',
      description: 'Tres medallones de carne vacuna',
      price: 25000,
      available: false,
      categorySlug: 'hamburguesas',
    },
    {
      name: 'Ensalada Caesar',
      slug: 'ensalada-caesar',
      description: 'Ensalada Caesar con pollo y crutones',
      imageUrl: 'https://i.imgur.com/v64xdew.png',
      price: 15000,
      available: false,
      categorySlug: 'ensaladas',
    },
    {
      name: 'jamón y queso',
      slug: 'jamon-y-queso',
      description: 'Fetas de jamón y queso',
      imageUrl: 'https://i.imgur.com/zG4Zn7D.png',
      price: 1500,
      available: true,
      categorySlug: 'adicional',
    },
    {
      name: 'Cheddar',
      slug: 'cheddar',
      description: 'Cheddar fundido',
      imageUrl: 'https://i.imgur.com/pD9z1MS.png',
      price: 2000,
      available: true,
      categorySlug: 'adicional',
    },
    {
      name: 'Lechuga',
      slug: 'lechuga',
      description: 'Hojas de lechuga fresca',
      imageUrl: 'https://i.imgur.com/N7SThBu.png',
      price: 1000,
      available: true,
      categorySlug: 'adicional',
    },
    {
      name: 'Tomate',
      slug: 'tomate',
      description: 'Rodajas de tomate fresco',
      imageUrl: 'https://i.imgur.com/1XAUgGs.png',
      price: 1000,
      available: true,
      categorySlug: 'adicional',
    },
    {
      name: 'Bacon',
      slug: 'bacon',
      description: 'Bacon crujiente',
      imageUrl: 'https://i.imgur.com/ve0KXuX.png',
      price: 2000,
      available: true,
      categorySlug: 'adicional',
    },
    {
      name: 'Gaseosa Cola',
      slug: 'gaseosa-cola',
      description: 'Lata 354ml bien fría.',
      imageUrl: 'https://i.imgur.com/pcHLMse.png',
      price: 2000,
      available: true,
      categorySlug: 'bebidas',
    },
    {
      name: 'Gaseosa Pomelo rosado',
      slug: 'gaseosa-pomelo-rosado',
      description: 'Lata 354ml bien fría.',
      imageUrl: 'https://i.imgur.com/dc1498n.png',
      price: 2000,
      available: true,
      categorySlug: 'bebidas',
    },
    {
      name: 'Gaseosa Pomelo',
      slug: 'gaseosa-pomelo',
      description: 'Lata 354ml bien fría.',
      imageUrl: 'https://i.imgur.com/gm0LxxD.png',
      price: 2000,
      available: true,
      categorySlug: 'bebidas',
    },
    {
      name: 'Gaseosa lima limón',
      slug: 'gaseosa-lima-limon',
      description: 'Lata 354ml bien fría.',
      imageUrl: 'https://i.imgur.com/1WA37eR.png',
      price: 2000,
      available: true,
      categorySlug: 'bebidas',
    },
    {
      name: 'Gaseosa naranja',
      slug: 'gaseosa-naranja',
      description: 'Lata 354ml bien fría.',
      imageUrl: 'https://i.imgur.com/aoA1VqC.png',
      price: 2000,
      available: true,
      categorySlug: 'bebidas',
    },
    {
      name: 'Agua mineral',
      slug: 'agua-mineral',
      description: 'Botella 500ml bien fría.',
      imageUrl: 'https://i.imgur.com/nhAJj8c.png',
      price: 1500,
      available: true,
      categorySlug: 'bebidas',
    },
    {
      name: 'Agua saborizada',
      slug: 'agua-saborizada',
      description: 'Botella 500ml bien fría.',
      imageUrl: 'https://i.imgur.com/PamP1fG.png',
      price: 2000,
      available: true,
      categorySlug: 'bebidas',
    },
    {
      name: 'Mayonesa',
      slug: 'mayonesa',
      description: 'Sobre de mayonesa',
      price: 0,
      imageUrl: 'https://i.imgur.com/9ORPGEy.png',
      available: true,
      categorySlug: 'aderezos',
    },
    {
      name: 'Mostaza',
      slug: 'mostaza',
      description: 'Sobre de mostaza',
      price: 0,
      imageUrl: 'https://i.imgur.com/KOD6nei.png',
      available: true,
      categorySlug: 'aderezos',
    },
    {
      name: 'Ketchup',
      slug: 'ketchup',
      description: 'Sobre de ketchup',
      price: 0,
      imageUrl: 'https://i.imgur.com/WzNa73q.png',
      available: true,
      categorySlug: 'aderezos',
    },
  ];

  for (const prod of productosDemo) {
    const { categorySlug, imageUrl, ...data } = prod;
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        ...data,
        categories: {
          connect: { slug: categorySlug },
        },
        ...(imageUrl
          ? {
              images: {
                create: [{ url: imageUrl, sortOrder: 0 }],
              },
            }
          : {}),
      },
    });
  }

  console.log('Categorías y productos de prueba cargados.');

  await seedStock();
  await seedDelayedOrders(testCustomerId);
}

const DEMO_STOCK = 100;

/**
 * Stock inicial de todos los productos en la sucursal de demo (HU-17): sin fila de stock no se puede pedir.
 * No pisa lo que ya haya cargado el admin.
 */
async function seedStock() {
  const branch = await prisma.branch.findFirstOrThrow({ where: { name: DEFAULT_BRANCH.name } });
  const products = await prisma.product.findMany({ select: { id: true } });
  const { count } = await prisma.stock.createMany({
    data: products.map((product) => ({ branchId: branch.id, productId: product.id, available: DEMO_STOCK })),
    skipDuplicates: true,
  });
  console.log(`Stock inicial en ${DEFAULT_BRANCH.name}: ${count} productos nuevos con ${DEMO_STOCK} unidades.`);
}

const MINUTE_MS = 60_000;

/**
 * Pedidos del cliente de prueba para mostrar la demora (DEV-15): uno en camino que ya pasó su hora
 * estimada y uno entregado tarde. Se recrean en cada seed, con horas relativas a ahora.
 */
async function seedDelayedOrders(customerId: string) {
  const branch = await prisma.branch.findFirstOrThrow({ where: { name: DEFAULT_BRANCH.name } });
  const burger = await prisma.product.findUniqueOrThrow({ where: { slug: 'hamburguesa-simple' } });
  const address = await prisma.address.upsert({
    where: { id: 'demo-address-cliente' },
    update: {},
    create: {
      id: 'demo-address-cliente',
      userId: customerId,
      street: 'Av. Rivadavia 2000, CABA',
      latitude: -34.6094,
      longitude: -58.3960,
    },
  });

  const now = Date.now();
  const demos = [
    {
      id: 'demo-order-demorado',
      createdMinutesAgo: 60,
      etaMinutes: 35,
      statuses: ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'] as const,
    },
    {
      id: 'demo-order-entregado-tarde',
      createdMinutesAgo: 180,
      etaMinutes: 35,
      statuses: ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way', 'delivered'] as const,
      deliveredAfterMinutes: 55,
    },
  ];

  for (const demo of demos) {
    const createdAt = new Date(now - demo.createdMinutesAgo * MINUTE_MS);
    const status = demo.statuses[demo.statuses.length - 1];
    await prisma.order.deleteMany({ where: { id: demo.id } });
    await prisma.order.create({
      data: {
        id: demo.id,
        userId: customerId,
        branchId: branch.id,
        addressId: address.id,
        status,
        totalAmount: burger.price,
        createdAt,
        estimatedDeliveryAt: new Date(createdAt.getTime() + demo.etaMinutes * MINUTE_MS),
        items: { create: [{ productId: burger.id, quantity: 1, unitPrice: burger.price }] },
        statusHistory: {
          // Un cambio cada 10 minutos; el de entrega, cuando indica la demo.
          create: demo.statuses.map((historyStatus, index) => ({
            status: historyStatus,
            changedAt: new Date(
              createdAt.getTime() +
                (historyStatus === 'delivered' && demo.deliveredAfterMinutes
                  ? demo.deliveredAfterMinutes
                  : index * 10) *
                  MINUTE_MS,
            ),
          })),
        },
      },
    });
  }

  console.log('Pedidos demorados de prueba cargados (cliente de prueba).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
