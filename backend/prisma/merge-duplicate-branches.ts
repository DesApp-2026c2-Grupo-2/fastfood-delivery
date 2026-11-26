import { PrismaClient } from '@prisma/client';

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function baseName(name: string) {
  return normalize(name).split(' - ')[0];
}

function isHurlingham(name: string) {
  const key = normalize(name);
  return key.includes('hurlingham') || key.includes('hurlingam');
}

const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { orders: true } } },
  });

  const keepers = branches.filter((branch) => isHurlingham(branch.name));
  const extras = branches.filter((branch) => !isHurlingham(branch.name));
  if (keepers.length === 0) {
    throw new Error('No hay sucursales de Hurlingham para conservar.');
  }
  if (extras.length === 0) {
    console.log('Solo quedan las sucursales de Hurlingham.');
    for (const keeper of keepers) {
      console.log(`  ${keeper.name} (${keeper.address}) · ${keeper._count.orders} pedidos`);
    }
    return;
  }

  const keeperByBase = new Map<string, (typeof keepers)[number]>();
  for (const keeper of keepers) {
    const key = baseName(keeper.name);
    const current = keeperByBase.get(key);
    if (!current || keeper._count.orders > current._count.orders) keeperByBase.set(key, keeper);
  }

  const planned: { extra: (typeof extras)[number]; keeper: (typeof keepers)[number] }[] = [];
  const unmatched: (typeof extras)[number][] = [];
  for (const extra of extras) {
    const keeper = keeperByBase.get(baseName(extra.name));
    if (keeper) planned.push({ extra, keeper });
    else unmatched.push(extra);
  }

  const usedKeeperIds = new Set(planned.map((item) => item.keeper.id));
  const openKeepers = [...keepers]
    .filter((keeper) => !usedKeeperIds.has(keeper.id))
    .sort((a, b) => a._count.orders - b._count.orders || a.name.localeCompare(b.name));
  const incoming = new Map<string, number>(keepers.map((keeper) => [keeper.id, keeper._count.orders]));
  unmatched.sort((a, b) => b._count.orders - a._count.orders);
  for (const extra of unmatched) {
    const pool = openKeepers.length > 0 ? openKeepers : keepers;
    const keeper = [...pool].sort(
      (a, b) => (incoming.get(a.id) ?? 0) - (incoming.get(b.id) ?? 0) || a.name.localeCompare(b.name),
    )[0];
    planned.push({ extra, keeper });
    incoming.set(keeper.id, (incoming.get(keeper.id) ?? 0) + extra._count.orders);
    const index = openKeepers.findIndex((item) => item.id === keeper.id);
    if (index >= 0) openKeepers.splice(index, 1);
  }

  for (const { extra, keeper } of planned) {
    console.log(`"${extra.name}" (${extra.address}, ${extra._count.orders} pedidos) → "${keeper.name}"`);
    const movedOrders = await prisma.$transaction(
      async (tx) => {
        const orders = await tx.order.updateMany({
          where: { branchId: extra.id },
          data: { branchId: keeper.id },
        });
        await tx.stockRelease.updateMany({
          where: { branchId: extra.id },
          data: { branchId: keeper.id },
        });

        const [extraStock, keeperStock] = await Promise.all([
          tx.stock.findMany({ where: { branchId: extra.id }, select: { id: true, productId: true } }),
          tx.stock.findMany({ where: { branchId: keeper.id }, select: { productId: true } }),
        ]);
        const already = new Set(keeperStock.map((row) => row.productId));
        const missingIds = extraStock.filter((row) => !already.has(row.productId)).map((row) => row.id);
        if (missingIds.length > 0) {
          await tx.stock.updateMany({ where: { id: { in: missingIds } }, data: { branchId: keeper.id } });
        }

        const keeperHours = await tx.branchHour.count({ where: { branchId: keeper.id } });
        if (keeperHours === 0) {
          await tx.branchHour.updateMany({ where: { branchId: extra.id }, data: { branchId: keeper.id } });
        }

        await tx.branch.delete({ where: { id: extra.id } });
        return orders.count;
      },
      { maxWait: 20000, timeout: 120000 },
    );
    console.log(`  Listo: ${movedOrders} pedidos pasados a "${keeper.name}".`);
  }

  const left = await prisma.branch.findMany({ orderBy: { name: 'asc' }, select: { name: true, address: true } });
  console.log('Quedan:');
  for (const branch of left) console.log(`  ${branch.name} (${branch.address})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
