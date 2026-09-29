/** Unidades de un producto que mueve un pedido en el stock de su sucursal. */
export type StockLine = { productId: string; name: string; quantity: number };

type ItemWithExtras = {
  product: { id: string; name: string };
  quantity: number;
  extras: { id: string; name: string }[];
};

/**
 * Suma por producto las unidades de un pedido. Los adicionales también son productos: una hamburguesa
 * ×2 con bacon lleva 2 bacon. Queda ordenado por id para que dos pedidos simultáneos bloqueen las filas
 * de Stock en el mismo orden y no se traben entre sí.
 */
export function stockLines(items: ItemWithExtras[]): StockLine[] {
  const units = new Map<string, StockLine>();
  const add = (id: string, name: string, quantity: number) => {
    const line = units.get(id);
    if (line) {
      line.quantity += quantity;
    } else {
      units.set(id, { productId: id, name, quantity });
    }
  };

  for (const item of items) {
    add(item.product.id, item.product.name, item.quantity);
    for (const extra of item.extras) {
      add(extra.id, extra.name, item.quantity);
    }
  }

  return [...units.values()].sort((a, b) => a.productId.localeCompare(b.productId));
}
