import { api } from '../api/client';
import type { Cart, CartItem, Product } from '../api/types';

const GUEST_CART_KEY = 'guest_cart';

type GuestLine = {
  productId: string;
  quantity: number;
  notes: string;
  unitPrice: number;
  product: CartItem['product'];
};

function readLines(): GuestLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLines(lines: GuestLine[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
}

function toCart(lines: GuestLine[]): Cart {
  const items: CartItem[] = lines.map((line) => ({
    id: `guest:${line.productId}`,
    productId: line.productId,
    quantity: line.quantity,
    notes: line.notes,
    unitPrice: line.unitPrice,
    subtotal: line.unitPrice * line.quantity,
    product: line.product,
  }));

  return {
    id: 'guest',
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

function snapshot(product: Product, notes: string, quantity: number): GuestLine {
  return {
    productId: product.id,
    quantity,
    notes,
    unitPrice: product.price,
    product: {
      id: product.id,
      name: product.name,
      available: product.available,
      imageUrl: product.images?.[0]?.url || product.imageUrl,
    },
  };
}

export function getGuestCart(): Cart {
  return toCart(readLines());
}

export function addGuestItem(product: Product, quantity: number, notes: string): Cart {
  const lines = readLines();
  const existing = lines.find((line) => line.productId === product.id);
  if (existing) {
    existing.quantity += quantity;
    if (notes) existing.notes = notes;
    existing.unitPrice = product.price;
    existing.product = snapshot(product, existing.notes, existing.quantity).product;
  } else {
    lines.push(snapshot(product, notes, quantity));
  }
  writeLines(lines);
  return toCart(lines);
}

export function updateGuestItem(productId: string, quantity: number, notes: string): Cart {
  const lines = readLines()
    .map((line) =>
      line.productId === productId ? { ...line, quantity, notes } : line,
    )
    .filter((line) => line.quantity >= 1);
  writeLines(lines);
  return toCart(lines);
}

export function removeGuestItem(productId: string): Cart {
  const lines = readLines().filter((line) => line.productId !== productId);
  writeLines(lines);
  return toCart(lines);
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

export async function hydrateGuestCart(): Promise<Cart> {
  const lines = readLines();
  const next: GuestLine[] = [];

  for (const line of lines) {
    try {
      const product = await api<Product>(`/products/${line.productId}`);
      next.push({
        ...snapshot(product, line.notes, line.quantity),
        quantity: line.quantity,
        notes: line.notes,
      });
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
      }),
    });
  }

  clearGuestCart();
}
