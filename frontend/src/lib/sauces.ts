import type { Product } from '../api/types';

export function categoryKey(category: { slug?: string | null; name?: string | null } | null | undefined) {
  return (category?.slug || category?.name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function productKeys(product: Pick<Product, 'categories' | 'category'>) {
  const keys = (product.categories ?? []).map((category) => categoryKey(category));
  if (product.category) keys.push(categoryKey(product.category));
  return keys;
}

export function isSauceProduct(product: Pick<Product, 'categories' | 'category'>) {
  return productKeys(product).includes('aderezos');
}

export function isBurgerProduct(product: Pick<Product, 'categories' | 'category'>) {
  return productKeys(product).includes('hamburguesas');
}

export function isSideProduct(product: Pick<Product, 'categories' | 'category'>) {
  return productKeys(product).includes('guarnicion');
}

export type MealCounts = {
  burgers: number;
  sides: number;
  sauces: number;
  sauceQtyByProductId: Record<string, number>;
  /** Tope de cada aderezo: 2 por hamburguesa y 2 por guarnición. */
  maxPerSauce: number;
};

export function countMeals(
  items: { productId: string; quantity: number }[],
  catalog: Pick<Product, 'id' | 'categories' | 'category'>[],
): MealCounts {
  let burgers = 0;
  let sides = 0;
  let sauces = 0;
  const sauceQtyByProductId: Record<string, number> = {};

  for (const item of items) {
    const product = catalog.find((entry) => entry.id === item.productId);
    if (!product) continue;
    if (isBurgerProduct(product)) burgers += item.quantity;
    else if (isSideProduct(product)) sides += item.quantity;
    else if (isSauceProduct(product)) {
      sauces += item.quantity;
      sauceQtyByProductId[item.productId] = (sauceQtyByProductId[item.productId] ?? 0) + item.quantity;
    }
  }

  return {
    burgers,
    sides,
    sauces,
    sauceQtyByProductId,
    maxPerSauce: (burgers + sides) * 2,
  };
}

/** Los aderezos quedan al final y el resto conserva el orden en que se agregó. */
export function withSaucesLast<T extends { productId: string }>(
  items: T[],
  catalog: Pick<Product, 'id' | 'categories' | 'category'>[],
): T[] {
  const meals: T[] = [];
  const sauces: T[] = [];
  for (const item of items) {
    const product = catalog.find((entry) => entry.id === item.productId);
    if (product && isSauceProduct(product)) sauces.push(item);
    else meals.push(item);
  }
  return [...meals, ...sauces];
}

export function sauceOverLimitLabel(counts: MealCounts, catalog: { id: string; name: string }[]) {
  return Object.entries(counts.sauceQtyByProductId)
    .filter(([, quantity]) => quantity > counts.maxPerSauce)
    .map(([id, quantity]) => {
      const name = catalog.find((product) => product.id === id)?.name ?? 'Un aderezo';
      const extra = quantity - counts.maxPerSauce;
      return `${name} tiene ${quantity}: quitá ${extra}.`;
    })
    .join(' ');
}
