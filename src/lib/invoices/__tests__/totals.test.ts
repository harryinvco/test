import { describe, it, expect } from "vitest";
import { computeItemTotal, computeInvoiceTotals } from "@/lib/invoices/totals";

describe("computeItemTotal", () => {
  it("multiplies quantity by unit price and rounds", () => {
    expect(computeItemTotal({ quantity: 2, unitPriceCents: 5000 })).toBe(10000);
  });
  it("rounds fractional cents", () => {
    expect(computeItemTotal({ quantity: 1.333, unitPriceCents: 30000 })).toBe(39990);
    expect(computeItemTotal({ quantity: 0.1, unitPriceCents: 99 })).toBe(10);
  });
  it("handles zero quantity/price", () => {
    expect(computeItemTotal({ quantity: 0, unitPriceCents: 10000 })).toBe(0);
    expect(computeItemTotal({ quantity: 5, unitPriceCents: 0 })).toBe(0);
  });
});

describe("computeInvoiceTotals", () => {
  it("sums items, adds tax", () => {
    const t = computeInvoiceTotals(
      [
        { quantity: 2, unitPriceCents: 10000 },
        { quantity: 1, unitPriceCents: 5000 },
      ],
      3000,
    );
    expect(t).toEqual({ subtotalCents: 25000, taxCents: 3000, totalCents: 28000 });
  });
  it("empty items => zero totals", () => {
    expect(computeInvoiceTotals([])).toEqual({
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
  });
  it("tax defaults to 0 when omitted", () => {
    const t = computeInvoiceTotals([{ quantity: 1, unitPriceCents: 1000 }]);
    expect(t.taxCents).toBe(0);
    expect(t.totalCents).toBe(1000);
  });
});
