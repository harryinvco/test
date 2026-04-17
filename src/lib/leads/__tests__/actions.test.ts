import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { leads, clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  _createLead,
  _updateLead,
  _deleteLead,
  _updateStage,
  _convertToClient,
} from "@/lib/leads/actions";

describe("lead actions (core)", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  const baseInput = {
    name: "Harry",
    email: "h@i.co",
    industry: "retail" as const,
    source: "inbound" as const,
    stage: "new" as const,
  };

  it("_createLead inserts and returns the new row with id + timestamps", async () => {
    const row = await _createLead(db, baseInput);
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.stage).toBe("new");
    expect(row.createdAt).toBeGreaterThan(0);
    expect(row.updatedAt).toBe(row.createdAt);
  });

  it("_updateLead modifies fields and bumps updatedAt", async () => {
    const row = await _createLead(db, baseInput);
    await new Promise((r) => setTimeout(r, 5));
    const updated = await _updateLead(db, row.id, { name: "Harry R." });
    expect(updated!.name).toBe("Harry R.");
    expect(updated!.updatedAt).toBeGreaterThan(row.updatedAt);
  });

  it("_updateLead returns null for unknown id", async () => {
    expect(await _updateLead(db, "missing", { name: "x" })).toBeNull();
  });

  it("_deleteLead removes the row", async () => {
    const row = await _createLead(db, baseInput);
    const deleted = await _deleteLead(db, row.id);
    expect(deleted).toBe(true);
    const remaining = await db.select().from(leads).where(eq(leads.id, row.id));
    expect(remaining).toEqual([]);
  });

  it("_updateStage changes stage and bumps updatedAt", async () => {
    const row = await _createLead(db, baseInput);
    await new Promise((r) => setTimeout(r, 5));
    const updated = await _updateStage(db, row.id, "qualified");
    expect(updated?.stage).toBe("qualified");
    expect(updated!.updatedAt).toBeGreaterThan(row.updatedAt);
  });

  it("_updateStage rejects invalid stage", async () => {
    const row = await _createLead(db, baseInput);
    // @ts-expect-error - runtime check
    await expect(_updateStage(db, row.id, "garbage")).rejects.toThrow();
  });
});

describe("_convertToClient", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  const base = {
    name: "Harry",
    email: "h@i.co",
    industry: "retail" as const,
    source: "inbound" as const,
    stage: "won" as const,
  };

  it("creates a client, links back on the lead, and is idempotent", async () => {
    const lead = await _createLead(db, base);

    const first = await _convertToClient(db, lead.id);
    expect(first.created).toBe(true);
    expect(first.client.fromLeadId).toBe(lead.id);
    expect(first.client.name).toBe(lead.name);
    expect(first.client.industry).toBe("retail");
    expect(first.client.status).toBe("active");

    const refreshed = await db.select().from(leads).where(eq(leads.id, lead.id));
    expect(refreshed[0].convertedClientId).toBe(first.client.id);
    expect(refreshed[0].convertedAt).not.toBeNull();

    const second = await _convertToClient(db, lead.id);
    expect(second.created).toBe(false);
    expect(second.client.id).toBe(first.client.id);

    const allClients = await db.select().from(clients);
    expect(allClients).toHaveLength(1);
  });

  it("throws if lead does not exist", async () => {
    await expect(_convertToClient(db, "missing")).rejects.toThrow(/not found/i);
  });
});
