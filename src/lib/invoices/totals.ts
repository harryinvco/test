export type ItemInput = {
  quantity: number;
  unitPriceCents: number;
};

export function computeItemTotal(item: ItemInput): number {
  return Math.round(item.quantity * item.unitPriceCents);
}

export function computeInvoiceTotals(
  items: ItemInput[],
  taxCents = 0,
): { subtotalCents: number; taxCents: number; totalCents: number } {
  const subtotalCents = items.reduce((s, it) => s + computeItemTotal(it), 0);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}
