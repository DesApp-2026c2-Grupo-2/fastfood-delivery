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

  // 1. Admin base de Carla
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

  // 2. Sucursal base
  const existingBranch = await prisma.branch.findFirst({
    where: { name: DEFAULT_BRANCH.name },
  });

  if (!existingBranch) {
    await prisma.branch.create({ data: DEFAULT_BRANCH });
    console.log(`Sucursal seed listo: ${DEFAULT_BRANCH.name}`);
  } else {
    console.log(`Sucursal seed ya existe: ${DEFAULT_BRANCH.name}`);
  }

  // 3. Categorías base
  await prisma.category.upsert({
    where: { slug: 'guarnicion' },
    update: {},
    create: {
      name: 'Guarnición',
      slug: 'guarnicion',
    },
  });

  await prisma.category.upsert({
    where: { slug: 'hamburguesas' },
    update: {},
    create: {
      name: 'Hamburguesas',
      slug: 'hamburguesas',
    },
  });

  await prisma.category.upsert({
    where: { slug: 'ensaladas' },
    update: {},
    create: {
      name: 'Ensaladas',
      slug: 'ensaladas',
    },
  });

  await prisma.category.upsert({
    where: { slug: 'bebidas' },
    update: {},
    create: {
      name: 'Bebidas',
      slug: 'bebidas',
    },
  });

  await prisma.category.upsert({
    where: { slug: 'aderezos' },
    update: {},
    create: {
      name: 'Aderezos',
      slug: 'aderezos',
    },
  });

  await prisma.category.upsert({
    where: { slug: 'adicional' },
    update: {},
    create: {
      name: 'Adicional',
      slug: 'adicional',
    },
  });

  // 4. Productos del catálogo (HU-04)
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
                create: [
                  {
                    url: imageUrl,
                    sortOrder: 0,
                  },
                ],
              },
            }
          : {}),
      },
    });
  }

  console.log('Categorías y productos de prueba cargados.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });