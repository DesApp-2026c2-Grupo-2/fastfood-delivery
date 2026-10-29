import { spawnSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { databaseName, loadEnvFile, testDatabaseUrl } from './test-database';

loadEnvFile();
const raw = process.env.DATABASE_URL?.trim();
if (!raw) {
  throw new Error('Falta DATABASE_URL');
}

const testUrl = testDatabaseUrl(raw);
const name = databaseName(testUrl);
const adminUrl = new URL(raw);
adminUrl.pathname = '/postgres';

async function ensureDatabase() {
  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  try {
    const existing = await admin.$queryRaw<{ datname: string }[]>`
      SELECT datname FROM pg_database WHERE datname = ${name}
    `;
    if (existing.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await admin.$disconnect();
  }
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DATABASE_URL: testUrl },
    cwd: process.cwd(),
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  await ensureDatabase();
  run('npx', ['prisma', 'migrate', 'deploy']);
  const probe = new PrismaClient({ datasources: { db: { url: testUrl } } });
  try {
    const admins = await probe.user.count({ where: { role: 'admin' } });
    if (admins === 0) {
      run('npx', ['prisma', 'db', 'seed']);
    }
  } finally {
    await probe.$disconnect();
  }
  console.log(`Base de tests lista: ${name}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
