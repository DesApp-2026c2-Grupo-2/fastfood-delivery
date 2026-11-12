export const CART_DISABLED_MESSAGE =
  'Este carrito quedó inhabilitado. Vacialo y armalo de nuevo para seguir con el pedido.';

export type StockReleaseNotice = {
  productId: string;
  releasedAt: string;
};

export function guestCartBlocked(
  items: { productId: string; addedAt?: string; extras?: { id: string }[] }[],
  releases: StockReleaseNotice[],
): boolean {
  const releasedAt = new Map(releases.map((release) => [release.productId, Date.parse(release.releasedAt)]));
  return items.some((item) => {
    const ids = [item.productId, ...(item.extras ?? []).map((extra) => extra.id)];
    const stamps = ids
      .map((id) => releasedAt.get(id))
      .filter((stamp): stamp is number => stamp !== undefined && !Number.isNaN(stamp));
    if (stamps.length === 0) return false;
    const added = item.addedAt ? Date.parse(item.addedAt) : Number.NaN;
    if (Number.isNaN(added)) return true;
    return stamps.some((stamp) => stamp > added);
  });
}
