import { PrismaClient } from '@prisma/client';
import { databaseName, loadEnvFile } from './test-database';

loadEnvFile();
const url = process.env.DATABASE_URL?.trim();
if (!url) throw new Error('Falta DATABASE_URL');

const keys = [
  'top3_campaign_started_at',
  'loyalty_campaign_active',
  'loyalty_orders_required',
  'loyalty_min_order_amount',
  'loyalty_discount_percent',
  'top3_discount_percent',
];

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.parameter.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
      orderBy: { key: 'asc' },
    });
    const sample = await prisma.order.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { code: true, branch: { select: { name: true } } },
    });
    console.log(databaseName(url));
    console.log(rows.map((row) => `${row.key}=${row.value}`).join('\n'));
    console.log(sample ? `${sample.branch.name} ${sample.code}` : 'sin pedidos');
  } finally {
    await prisma.$disconnect();
  }
}

main();
