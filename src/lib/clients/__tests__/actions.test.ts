import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { _createClient, _updateClient, _deleteClient } from "@/lib/clients/actions";

describe("client actions (core)", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  const input = {
    name: "Acme",
    email: "ops@acme.cy",
    industry: "retail" as const,
    status: "active" as const,
    contract_start_date: "2026-04-01",
  };

  it("_createClient inserts with id + timestamps", async () => {
    const row = await _createClient(db, input);
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.status).toBe("active");
  });

  it("_updateClient patches and bumps updatedAt", async () => {
    const row = await _createClient(db, input);
    await new Promise((r) => setTimeout(r, 5));
    const updated = await _updateClient(db, row.id, { mrr_cents: 300000 });
    expect(updated?.mrrCents).toBe(300000);
    expect(updated!.updatedAt).toBeGreaterThan(row.updatedAt);
  });

  it("_deleteClient removes the row", async () => {
    const row = await _createClient(db, input);
    expect(await _deleteClient(db, row.id)).toBe(true);
  });
});
