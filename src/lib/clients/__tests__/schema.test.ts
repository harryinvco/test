import { describe, it, expect } from "vitest";
import { ClientCreate, ClientUpdate } from "@/lib/clients/schema";

const valid = {
  name: "Acme",
  company: "Acme Ltd",
  email: "ops@acme.cy",
  phone: "+357",
  industry: "retail" as const,
  status: "active" as const,
  contract_start_date: "2026-04-01",
  mrr_cents: 200000,
};

describe("ClientCreate", () => {
  it("accepts valid", () => expect(() => ClientCreate.parse(valid)).not.toThrow());
  it("requires name + email + industry + contract_start_date", () => {
    expect(() => ClientCreate.parse({ ...valid, name: "" })).toThrow();
    expect(() => ClientCreate.parse({ ...valid, email: "bad" })).toThrow();
    expect(() => ClientCreate.parse({ ...valid, industry: "xyz" })).toThrow();
    expect(() => ClientCreate.parse({ ...valid, contract_start_date: "2026/04/01" })).toThrow();
  });
  it("rejects invalid status", () => {
    expect(() => ClientCreate.parse({ ...valid, status: "zombie" })).toThrow();
  });
  it("rejects negative mrr_cents", () => {
    expect(() => ClientCreate.parse({ ...valid, mrr_cents: -1 })).toThrow();
  });
});

describe("ClientUpdate", () => {
  it("accepts partial", () => expect(ClientUpdate.parse({ status: "paused" })).toEqual({ status: "paused" }));
});
