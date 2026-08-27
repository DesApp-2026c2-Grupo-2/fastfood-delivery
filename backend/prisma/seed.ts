import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
