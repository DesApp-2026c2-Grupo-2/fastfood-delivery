import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Tres letras de la sucursal, sin espacios ni tildes. Si el nombre es más corto, se completa con X. */
export function branchCodePrefix(name: string): string {
  const letters = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  return (letters + 'XXX').slice(0, 3);
}

/** Tres letras de la sucursal + seis dígitos. Reintenta si ese código ya existe. */
export async function allocateOrderCode(tx: Prisma.TransactionClient, branchName: string): Promise<string> {
  const prefix = branchCodePrefix(branchName);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `${prefix}${100000 + Math.floor(Math.random() * 900000)}`;
    const taken = await tx.order.findUnique({ where: { code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new ConflictException('No se pudo generar el código del pedido');
}
