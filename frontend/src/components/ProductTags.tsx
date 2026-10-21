import type { Category, Product } from '../api/types';

export function productCategories(product: Product): Category[] {
  if (product.categories?.length) return product.categories;
  return product.category ? [product.category] : [];
}

export function PromoBadge() {
  return <span className="promo-badge">2x1</span>;
}

export function ProductTags({ product }: { product: Product }) {
  const tags = productCategories(product);
  if (tags.length === 0) return null;
  return (
    <ul className="tag-list">
      {tags.map((tag) => (
        <li key={tag.id} className="tag">
          {tag.name}
        </li>
      ))}
    </ul>
  );
}
