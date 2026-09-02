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

  const existingBranch = await prisma.branch.findFirst({
    where: { name: DEFAULT_BRANCH.name },
  });

  if (!existingBranch) {
    await prisma.branch.create({ data: DEFAULT_BRANCH });
    console.log(`Sucursal seed listo: ${DEFAULT_BRANCH.name}`);
  } else {
    console.log(`Sucursal seed ya existe: ${DEFAULT_BRANCH.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
