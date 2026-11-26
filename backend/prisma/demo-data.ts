import { Fulfillment, OrderStatus, Prisma, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const MINUTE_MS = 60_000;

const DEMO_BRANCHES = [
  {
    name: 'Mordi Centro',
    address: 'Av. Corrientes 1234, CABA',
    latitude: -34.6037,
    longitude: -58.3816,
    phone: '+54 11 4000-0000',
  },
  {
    name: 'Mordi Norte',
    address: 'Av. Cabildo 2200, CABA',
    latitude: -34.5627,
    longitude: -58.456,
    phone: '+54 11 4000-0001',
  },
  {
    name: 'Mordi Oeste',
    address: 'Av. Rivadavia 5500, CABA',
    latitude: -34.6186,
    longitude: -58.4437,
    phone: '+54 11 4000-0002',
  },
];

const DEMO_CUSTOMERS = [
  { key: 'ana', email: 'ana@mordi.local', name: 'Ana López', stamps: 8, street: 'Av. Corrientes 1800', postalCode: 'C1042' },
  { key: 'bruno', email: 'bruno@mordi.local', name: 'Bruno Díaz', stamps: 4, street: 'Av. Cabildo 1500', postalCode: 'C1426' },
  { key: 'elena', email: 'elena@mordi.local', name: 'Elena Paz', stamps: 9, street: 'Av. Santa Fe 3200', postalCode: 'C1425' },
  { key: 'carla', email: 'carla@mordi.local', name: 'Carla Méndez', stamps: 6, street: 'Av. Rivadavia 4100', postalCode: 'C1204' },
  { key: 'diego', email: 'diego@mordi.local', name: 'Diego Ruiz', stamps: 3, street: 'Av. Córdoba 2500', postalCode: 'C1120' },
  { key: 'facundo', email: 'facundo@mordi.local', name: 'Facundo Sosa', stamps: 2, street: 'Av. Callao 900', postalCode: 'C1023' },
];

const TODAY_STATUSES: OrderStatus[] = [
  OrderStatus.pending,
  OrderStatus.confirmed,
  OrderStatus.preparing,
  OrderStatus.ready,
  OrderStatus.on_the_way,
  OrderStatus.delivered,
  OrderStatus.cancelled,
];

function todayIsoAR(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function demoDate(daysAgo: number, hour: number, minute: number) {
  const [year, month, day] = todayIsoAR().split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - daysAgo);
  const ymd = date.toISOString().slice(0, 10);
  return new Date(`${ymd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`);
}

function flow(status: OrderStatus, pickup: boolean): OrderStatus[] {
  if (status === OrderStatus.cancelled) return [OrderStatus.pending, OrderStatus.cancelled];
  const steps: OrderStatus[] = pickup
    ? [OrderStatus.pending, OrderStatus.confirmed, OrderStatus.preparing, OrderStatus.ready, OrderStatus.delivered]
    : [
        OrderStatus.pending,
        OrderStatus.confirmed,
        OrderStatus.preparing,
        OrderStatus.ready,
        OrderStatus.on_the_way,
        OrderStatus.delivered,
      ];
  const index = steps.indexOf(status);
  return steps.slice(0, index + 1);
}

export async function seedDemoBranches(prisma: PrismaClient) {
  for (const branch of DEMO_BRANCHES) {
    const existing = await prisma.branch.findFirst({ where: { name: branch.name } });
    const saved =
      existing ??
      (await prisma.branch.create({
        data: {
          ...branch,
          city: 'CABA',
          province: 'Ciudad Autónoma de Buenos Aires',
          postalCode: 'C1000',
          openingHours: 'Lun-Dom 10:00-23:00',
          active: true,
        },
      }));

    const hours = await prisma.branchHour.count({ where: { branchId: saved.id } });
    if (hours === 0) {
      await prisma.branchHour.createMany({
        data: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          branchId: saved.id,
          weekday,
          slot: 0,
          opensAt: '10:00',
          closesAt: '23:00',
        })),
      });
    }
  }
  console.log('Sucursales de demo listas: Mordi Centro, Norte y Oeste.');
}

export async function seedDemoOrders(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash('Demo123!', 10);
  const customers = [];
  for (const person of DEMO_CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {
        name: person.name,
        passwordHash,
        role: Role.customer,
        adminRole: null,
        active: true,
        loyaltyStamps: person.stamps,
        hasTopBuyerReward: false,
      },
      create: {
        email: person.email,
        name: person.name,
        passwordHash,
        role: Role.customer,
        loyaltyStamps: person.stamps,
      },
    });
    const address = await prisma.address.upsert({
      where: { id: `demo-address-${person.key}` },
      update: { userId: user.id, street: person.street },
      create: {
        id: `demo-address-${person.key}`,
        userId: user.id,
        alias: 'Casa',
        street: person.street,
        city: 'CABA',
        province: 'Ciudad Autónoma de Buenos Aires',
        postalCode: person.postalCode,
        latitude: -34.6037,
        longitude: -58.39,
      },
    });
    customers.push({ ...person, id: user.id, addressId: address.id });
  }

  const guestAddress = await prisma.address.upsert({
    where: { id: 'demo-address-guest' },
    update: {},
    create: {
      id: 'demo-address-guest',
      alias: 'Invitado',
      street: 'Av. de Mayo 700, CABA',
      city: 'CABA',
      province: 'Ciudad Autónoma de Buenos Aires',
      postalCode: 'C1084',
      latitude: -34.6089,
      longitude: -58.3772,
    },
  });

  const branches = await prisma.branch.findMany({
    where: { name: { in: DEMO_BRANCHES.map((branch) => branch.name) } },
  });
  const branchByName = new Map(branches.map((branch) => [branch.name, branch]));
  const products = await prisma.product.findMany({
    where: {
      slug: {
        in: ['hamburguesa-doble', 'hamburguesa-simple', 'papas-fritas', 'gaseosa-cola', 'aros-de-cebolla', 'agua-mineral'],
      },
    },
  });
  const productBySlug = new Map(products.map((product) => [product.slug, product]));

  const norte = branchByName.get('Mordi Norte');
  const aros = productBySlug.get('aros-de-cebolla');
  if (norte && aros) {
    await prisma.stock.upsert({
      where: { branchId_productId: { branchId: norte.id, productId: aros.id } },
      update: { available: 0 },
      create: { branchId: norte.id, productId: aros.id, available: 0, reserved: 0 },
    });
  }

  await prisma.order.updateMany({
    where: { id: { startsWith: 'demo-ord-' }, couponIncidentId: { not: null } },
    data: { couponIncidentId: null },
  });
  await prisma.order.deleteMany({ where: { id: { startsWith: 'demo-ord-' } } });

  const historyDays = 183;
  let sequence = 0;
  const orders: Prisma.OrderCreateManyInput[] = [];
  const orderItems: Prisma.OrderItemCreateManyInput[] = [];
  const statusHistory: Prisma.OrderStatusHistoryCreateManyInput[] = [];
  const rand = mulberry32(20261126);
  const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const guestNames = ['Pedro Gómez', 'Valentina Ruiz', 'Joaquín Paz', 'Camila Ortiz', 'Nicolás Vega', 'Marina Costa'];
  const menu = [
    { slug: 'hamburguesa-doble', weight: 6 },
    { slug: 'hamburguesa-simple', weight: 4 },
    { slug: 'papas-fritas', weight: 5 },
    { slug: 'gaseosa-cola', weight: 4 },
    { slug: 'aros-de-cebolla', weight: 2 },
    { slug: 'agua-mineral', weight: 2 },
  ].flatMap((row) => {
    const product = productBySlug.get(row.slug);
    return product ? [{ product, weight: row.weight }] : [];
  });

  function pickWeighted<T>(rows: { item: T; weight: number }[]) {
    const total = rows.reduce((sum, row) => sum + row.weight, 0);
    let cursor = rand() * total;
    for (const row of rows) {
      cursor -= row.weight;
      if (cursor <= 0) return row.item;
    }
    return rows[rows.length - 1].item;
  }

  function isWeekend(daysAgo: number) {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'short',
    }).format(demoDate(daysAgo, 12, 0));
    return weekday === 'Sat' || weekday === 'Sun';
  }

  function slotsFor(daysAgo: number) {
    if (daysAgo === 0) return TODAY_STATUSES.length;
    const weekend = isWeekend(daysAgo);
    const wave = 0.7 + 0.65 * Math.abs(Math.sin(daysAgo / 17));
    const noise = 0.45 + rand() * 1.25;
    let count = Math.round((weekend ? 9 : 3.2) * wave * noise);
    if (!weekend && rand() < 0.09) count = randInt(0, 1);
    if (rand() < 0.06) count += weekend ? randInt(4, 7) : randInt(3, 6);
    const floor = weekend ? 5 : 0;
    return Math.max(floor, Math.min(count, weekend ? 16 : 10));
  }

  for (let daysAgo = historyDays; daysAgo >= 0; daysAgo -= 1) {
    const slots = slotsFor(daysAgo);
    for (let slot = 0; slot < slots; slot += 1) {
      sequence += 1;
      const status =
        daysAgo === 0 ? TODAY_STATUSES[slot] : rand() < 0.08 ? OrderStatus.cancelled : OrderStatus.delivered;
      const pickup = status !== OrderStatus.on_the_way && rand() < 0.3;
      const branch = pickWeighted([
        { item: branchByName.get('Mordi Centro'), weight: 5 },
        { item: branchByName.get('Mordi Norte'), weight: 2 },
        { item: branchByName.get('Mordi Oeste'), weight: 2 },
      ]);
      if (!branch) throw new Error('Falta una sucursal de demo');

      const customer = pickWeighted([
        ...customers.map((person) => ({
          item: person,
          weight: person.key === 'ana' || person.key === 'elena' ? 4 : person.key === 'facundo' ? 1 : 2,
        })),
        { item: null, weight: 3 },
      ]);
      const guest = customer == null;
      const chosen = new Set<string>();
      const lines: { product: (typeof menu)[number]['product']; qty: number }[] = [];
      const lineCount = randInt(1, rand() < 0.22 ? 3 : 2);
      while (lines.length < lineCount && chosen.size < menu.length) {
        const row = pickWeighted(menu.map((entry) => ({ item: entry, weight: entry.weight })));
        if (chosen.has(row.product.id)) continue;
        chosen.add(row.product.id);
        const burger = row.product.slug.startsWith('hamburguesa');
        lines.push({ product: row.product, qty: burger ? randInt(1, 2) : randInt(1, 3) });
      }
      const subtotal = lines.reduce((sum, line) => sum + Number(line.product.price) * line.qty, 0);
      const colaQty = lines.find((line) => line.product.slug === 'gaseosa-cola')?.qty ?? 0;
      const promoRoll = rand();
      let promotionName: string | null = null;
      let discount = 0;
      if (subtotal >= 20000 && promoRoll < 0.08) {
        promotionName = 'Premio Fidelidad';
        discount = Math.round(subtotal * 0.3);
      } else if (subtotal >= 15000 && promoRoll < 0.42) {
        promotionName = 'Martes 20';
        discount = Math.round(subtotal * 0.2);
      } else if (colaQty >= 2 && promoRoll < 0.62) {
        promotionName = '2x1 Gaseosa Cola';
        discount = 2000 * Math.floor(colaQty / 2);
      }
      const net = subtotal - discount;
      const deliveryFee = pickup || net >= 25000 ? 0 : randInt(1, 4) * 600;
      const createdAt =
        daysAgo === 0
          ? new Date(Date.now() - (8 - slot) * 40 * MINUTE_MS)
          : demoDate(daysAgo, randInt(11, 22), randInt(0, 59));
      const id = `demo-ord-${String(sequence).padStart(4, '0')}`;
      const steps = flow(status, pickup);

      orders.push({
        id,
        userId: guest ? null : customer.id,
        guestName: guest ? guestNames[randInt(0, guestNames.length - 1)] : null,
        guestEmail: guest ? `invitado.${sequence}@mordi.local` : null,
        branchId: branch.id,
        addressId: pickup ? null : guest ? guestAddress.id : customer.addressId,
        fulfillment: pickup ? Fulfillment.pickup : Fulfillment.delivery,
        status,
        subtotal,
        discountAmount: discount,
        deliveryFee,
        totalAmount: net + deliveryFee,
        promotionName,
        stockReserved: false,
        createdAt,
        estimatedDeliveryAt: new Date(createdAt.getTime() + 40 * MINUTE_MS),
      });
      for (const line of lines) {
        orderItems.push({
          orderId: id,
          productId: line.product.id,
          quantity: line.qty,
          unitPrice: line.product.price,
        });
      }
      for (const [index, historyStatus] of steps.entries()) {
        statusHistory.push({
          orderId: id,
          status: historyStatus,
          changedAt:
            historyStatus === OrderStatus.delivered
              ? new Date(createdAt.getTime() + (26 + (sequence % 4) * 2) * MINUTE_MS)
              : historyStatus === OrderStatus.cancelled
                ? new Date(createdAt.getTime() + 12 * MINUTE_MS)
                : new Date(createdAt.getTime() + index * 5 * MINUTE_MS),
        });
      }
    }
  }

  const chunk = 80;
  for (let index = 0; index < orders.length; index += chunk) {
    await prisma.order.createMany({ data: orders.slice(index, index + chunk) });
  }
  for (let index = 0; index < orderItems.length; index += chunk) {
    await prisma.orderItem.createMany({ data: orderItems.slice(index, index + chunk) });
  }
  for (let index = 0; index < statusHistory.length; index += chunk) {
    await prisma.orderStatusHistory.createMany({ data: statusHistory.slice(index, index + chunk) });
  }

  const ana = customers.find((customer) => customer.key === 'ana');
  const bruno = customers.find((customer) => customer.key === 'bruno');
  const diego = customers.find((customer) => customer.key === 'diego');
  const beforeYesterday = demoDate(1, 0, 0);
  async function deliveredIds(userId: string) {
    const rows = await prisma.order.findMany({
      where: {
        id: { startsWith: 'demo-ord-' },
        userId,
        status: OrderStatus.delivered,
        createdAt: { lt: beforeYesterday },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
  const anaOrders = ana ? await deliveredIds(ana.id) : [];
  const brunoOrders = bruno ? await deliveredIds(bruno.id) : [];
  const diegoOrders = diego ? await deliveredIds(diego.id) : [];
  const anaClaimOrderId = anaOrders[0];
  const brunoOpenOrderId = brunoOrders[0];
  const diegoClaimOrderId = diegoOrders[0];
  const diegoRedeemCandidates = diego
    ? await prisma.order.findMany({
        where: { id: { in: diegoOrders.slice(1) } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, subtotal: true, discountAmount: true, deliveryFee: true, promotionName: true },
      })
    : [];
  const couponFace = 3000;
  const diegoRedeem =
    diegoRedeemCandidates.find((order) => Number(order.subtotal) - Number(order.discountAmount) >= couponFace) ??
    diegoRedeemCandidates[0];
  if (!ana || !bruno || !diego || !anaClaimOrderId || !brunoOpenOrderId || !diegoClaimOrderId || !diegoRedeem) {
    throw new Error('La demo no dejó pedidos entregados para los reclamos');
  }

  await prisma.incident.deleteMany({
    where: { OR: [{ id: { in: ['demo-inc-ana', 'demo-inc-bruno', 'demo-inc-diego'] } }, { couponCode: { in: ['REC-MORDI1', 'REC-MORDI2'] } }] },
  });

  const couponAt = demoDate(6, 15, 0);
  await prisma.incident.create({
    data: {
      id: 'demo-inc-ana',
      orderId: anaClaimOrderId,
      userId: ana.id,
      reason: 'cold',
      message: 'La hamburguesa llegó fría.',
      status: 'resolved',
      response: 'Perdón por la espera. Te dejamos un cupón para el próximo pedido.',
      couponCode: 'REC-MORDI1',
      couponAmount: 5000,
      couponCreatedAt: couponAt,
      createdAt: demoDate(6, 14, 10),
      resolvedAt: couponAt,
    },
  });
  await prisma.incident.create({
    data: {
      id: 'demo-inc-bruno',
      orderId: brunoOpenOrderId,
      userId: bruno.id,
      reason: 'late',
      message: 'Llegó 40 minutos después de la hora estimada.',
      status: 'open',
      createdAt: demoDate(3, 21, 20),
    },
  });
  await prisma.incident.create({
    data: {
      id: 'demo-inc-diego',
      orderId: diegoClaimOrderId,
      userId: diego.id,
      reason: 'missing_item',
      message: 'Faltaban las papas fritas.',
      status: 'resolved',
      response: 'Te acreditamos las papas. El cupón ya se usó en el pedido siguiente.',
      couponCode: 'REC-MORDI2',
      couponAmount: 3000,
      couponCreatedAt: demoDate(8, 13, 0),
      createdAt: demoDate(8, 12, 40),
      resolvedAt: demoDate(8, 13, 0),
      responseSeenAt: demoDate(7, 19, 0),
    },
  });
  const room = Math.max(0, Math.round((Number(diegoRedeem.subtotal) - Number(diegoRedeem.discountAmount)) * 100) / 100);
  const couponDiscount = Math.min(couponFace, room);
  const discountAmount = Math.round((Number(diegoRedeem.discountAmount) + couponDiscount) * 100) / 100;
  const couponName = 'Cupón REC-MORDI2';
  await prisma.order.update({
    where: { id: diegoRedeem.id },
    data: {
      couponIncidentId: 'demo-inc-diego',
      discountAmount,
      totalAmount: Math.round((Number(diegoRedeem.subtotal) - discountAmount + Number(diegoRedeem.deliveryFee)) * 100) / 100,
      promotionName: diegoRedeem.promotionName ? `${diegoRedeem.promotionName} + ${couponName}` : couponName,
    },
  });

  const doble = productBySlug.get('hamburguesa-doble');
  const cola = productBySlug.get('gaseosa-cola');
  if (!doble || !cola) throw new Error('Faltan la doble o la gaseosa para el carrito de Ana');
  const cart = await prisma.cart.upsert({
    where: { userId: ana.id },
    update: { purchaseBlocked: false },
    create: { userId: ana.id },
  });
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cartItem.createMany({
    data: [
      { cartId: cart.id, productId: doble.id, quantity: 2 },
      { cartId: cart.id, productId: cola.id, quantity: 2 },
    ],
  });

  console.log(`Demo de operación: ${sequence} pedidos de los últimos 6 meses, carrito de Ana y tres reclamos.`);
  console.log('Clientes de demo, clave Demo123!: ana, bruno, elena, carla, diego y facundo @mordi.local');
  console.log('Ana tiene el carrito (2 dobles y 2 colas), 8 mordis y el cupón REC-MORDI1 de $5.000.');
  console.log('Elena tiene 9 mordis. Bruno tiene un reclamo abierto. Diego ya usó REC-MORDI2.');
}
