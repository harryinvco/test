import { describe, it, expect } from "vitest";
import { InvoiceCreate, InvoiceUpdate } from "@/lib/invoices/schema";

describe("InvoiceCreate", () => {
  const base = {
    issue_date: "2026-04-01",
    due_date: "2026-04-30",
    items: [
      { description: "Consulting", quantity: 10, unit_price_cents: 10000 },
    ],
  };

  it("accepts minimal valid input", () => {
    expect(InvoiceCreate.parse(base)).toMatchObject({
      issue_date: "2026-04-01",
      items: [{ description: "Consulting" }],
      tax_cents: 0,
    });
  });

  it("rejects bad date format", () => {
    expect(() =>
      InvoiceCreate.parse({ ...base, issue_date: "04/01/2026" }),
    ).toThrow();
  });

  it("requires at least one item", () => {
    expect(() => InvoiceCreate.parse({ ...base, items: [] })).toThrow();
  });

  it("rejects zero/negative quantity", () => {
    expect(() =>
      InvoiceCreate.parse({
        ...base,
        items: [{ description: "x", quantity: 0, unit_price_cents: 100 }],
      }),
    ).toThrow();
  });

  it("allows null/missing client_id", () => {
    expect(InvoiceCreate.parse({ ...base, client_id: null }).client_id).toBeNull();
  });
});

describe("InvoiceUpdate", () => {
  it("all fields optional", () => {
    expect(InvoiceUpdate.parse({})).toEqual({});
  });
  it("items array if present must have at least one", () => {
    expect(() => InvoiceUpdate.parse({ items: [] })).toThrow();
  });
});
