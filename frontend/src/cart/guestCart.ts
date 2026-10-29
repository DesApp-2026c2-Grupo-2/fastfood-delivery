import { api } from '../api/client';
import type { Cart, CartItem, Product } from '../api/types';

const GUEST_CART_KEY = 'guest_cart';

export type GuestExtra = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
};

type GuestLine = {
  productId: string;
  quantity: number;
  notes: string;
  unitPrice: number;
  product: CartItem['product'];
  extras: GuestExtra[];
};

function sortExtras(extras: GuestExtra[]): GuestExtra[] {
  return [...extras].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

function extrasKey(extras: { id: string }[]): string {
  return [...extras].map((extra) => extra.id).sort().join(',');
}

function lineId(line: GuestLine): string {
  const key = extrasKey(line.extras);
  return key ? `guest:${line.productId}:${key}` : `guest:${line.productId}`;
}

function normalizeExtra(extra: Partial<GuestExtra> | null | undefined): GuestExtra | null {
  if (!extra || typeof extra.id !== 'string' || !extra.id || typeof extra.name !== 'string' || !extra.name) {
    return null;
  }
  return {
    id: extra.id,
    name: extra.name,
    price: Number(extra.price) || 0,
    imageUrl: extra.imageUrl || null,
  };
}

function readLines(): GuestLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((line) => line && typeof line.productId === 'string')
      .map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        notes: line.notes ?? '',
        unitPrice: Number(line.unitPrice) || 0,
        product: line.product,
        extras: sortExtras(
          (Array.isArray(line.extras) ? line.extras : [])
            .map((extra) => normalizeExtra(extra))
            .filter((extra): extra is GuestExtra => extra !== null),
        ),
      }));
  } catch {
    return [];
  }
}

function writeLines(lines: GuestLine[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
}

function lineSubtotal(line: GuestLine): number {
  const extrasTotal = line.extras.reduce((sum, extra) => sum + extra.price, 0);
  return (line.unitPrice + extrasTotal) * line.quantity;
}

function toCart(lines: GuestLine[]): Cart {
  const items: CartItem[] = lines.map((line) => ({
    id: lineId(line),
    productId: line.productId,
    quantity: line.quantity,
    notes: line.notes,
    unitPrice: line.unitPrice,
    subtotal: lineSubtotal(line),
    product: line.product,
    extras: line.extras,
  }));

  return {
    id: 'guest',
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

function productSnapshot(product: Product): CartItem['product'] {
  return {
    id: product.id,
    name: product.name,
    available: product.available,
    imageUrl: product.images?.[0]?.url || product.imageUrl || '',
  };
}

function snapshot(product: Product, notes: string, quantity: number, extras: GuestExtra[]): GuestLine {
  return {
    productId: product.id,
    quantity,
    notes,
    unitPrice: Number(product.price) || 0,
    extras: sortExtras(extras),
    product: productSnapshot(product),
  };
}

function sameCombination(line: GuestLine, productId: string, extras: GuestExtra[]): boolean {
  return line.productId === productId && extrasKey(line.extras) === extrasKey(extras);
}

export function guestOrderItem(item: Pick<CartItem, 'productId' | 'quantity' | 'notes' | 'extras'>) {
  return {
    productId: item.productId,
    quantity: item.quantity,
    notes: item.notes,
    extraIds: (item.extras ?? []).map((extra) => extra.id),
  };
}

export function getGuestCart(): Cart {
  return toCart(readLines());
}

export function addGuestItem(product: Product, quantity: number, notes: string, extras: GuestExtra[] = []): Cart {
  const lines = readLines();
  const normalized = sortExtras(
    extras
      .map((extra) => normalizeExtra(extra))
      .filter((extra): extra is GuestExtra => extra !== null),
  );
  const existing = lines.find((line) => sameCombination(line, product.id, normalized));
  if (existing) {
    existing.quantity += quantity;
    if (notes) existing.notes = notes;
    existing.unitPrice = Number(product.price) || 0;
    existing.extras = normalized;
    existing.product = productSnapshot(product);
  } else {
    lines.push(snapshot(product, notes, quantity, normalized));
  }
  writeLines(lines);
  return toCart(lines);
}

export function updateGuestItem(itemId: string, quantity: number, notes: string): Cart {
  const lines = readLines()
    .map((line) => (lineId(line) === itemId ? { ...line, quantity, notes } : line))
    .filter((line) => line.quantity >= 1);
  writeLines(lines);
  return toCart(lines);
}

export function removeGuestItem(itemId: string): Cart {
  const lines = readLines().filter((line) => lineId(line) !== itemId);
  writeLines(lines);
  return toCart(lines);
}

export function removeGuestExtra(itemId: string, extraId: string): Cart {
  const lines = readLines();
  const index = lines.findIndex((line) => lineId(line) === itemId);
  if (index < 0) return toCart(lines);

  const line = lines[index];
  const extras = line.extras.filter((extra) => extra.id !== extraId);
  const siblingIndex = lines.findIndex(
    (other, otherIndex) => otherIndex !== index && sameCombination(other, line.productId, extras),
  );

  if (siblingIndex >= 0) {
    const sibling = lines[siblingIndex];
    sibling.quantity += line.quantity;
    if (!sibling.notes.trim() && line.notes.trim()) sibling.notes = line.notes;
    lines.splice(index, 1);
  } else {
    lines[index] = { ...line, extras: sortExtras(extras) };
  }

  writeLines(lines);
  return toCart(lines);
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

function extraFromProduct(product: Product): GuestExtra {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price) || 0,
    imageUrl: product.images?.[0]?.url || product.imageUrl || null,
  };
}

export async function hydrateGuestCart(): Promise<Cart> {
  const lines = readLines();
  const next: GuestLine[] = [];

  for (const line of lines) {
    try {
      const product = await api<Product>(`/products/${line.productId}`);
      const extras: GuestExtra[] = [];
      for (const extra of line.extras) {
        try {
          extras.push(extraFromProduct(await api<Product>(`/products/${extra.id}`)));
        } catch {
          extras.push(extra);
        }
      }
      const refreshed = snapshot(product, line.notes, line.quantity, extras);
      const sibling = next.find((other) => sameCombination(other, refreshed.productId, refreshed.extras));
      if (sibling) {
        sibling.quantity += refreshed.quantity;
        if (!sibling.notes.trim() && refreshed.notes.trim()) sibling.notes = refreshed.notes;
      } else {
        next.push(refreshed);
      }
    } catch {
      /* el producto ya no está disponible */
    }
  }

  writeLines(next);
  return toCart(next);
}

export async function mergeGuestCartIntoAccount(token: string) {
  const lines = readLines();
  if (lines.length === 0) return;

  for (const line of lines) {
    await api('/cart/items', {
      method: 'POST',
      token,
      body: JSON.stringify({
        productId: line.productId,
        quantity: line.quantity,
        notes: line.notes,
        extraIds: line.extras.map((extra) => extra.id),
      }),
    });
  }

  clearGuestCart();
}
