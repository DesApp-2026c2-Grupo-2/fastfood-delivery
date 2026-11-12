type WithCategories = {
  categories?: { slug: string }[];
};

export function isSauceProduct(product: WithCategories | null | undefined) {
  return Boolean(product?.categories?.some((category) => category.slug === 'aderezos'));
}

/** Los aderezos quedan al final. El resto conserva el orden original. */
export function withSaucesLast<T>(items: T[], isSauce: (item: T) => boolean): T[] {
  const meals: T[] = [];
  const sauces: T[] = [];
  for (const item of items) {
    if (isSauce(item)) sauces.push(item);
    else meals.push(item);
  }
  return [...meals, ...sauces];
}
