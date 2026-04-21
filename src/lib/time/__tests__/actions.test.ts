import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { clients, timeEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  _createTimeEntry,
  _updateTimeEntry,
  _deleteTimeEntry,
} from "@/lib/time/actions";
import { weeklyTotalHours, startOfWeekIsoDate } from "@/lib/time/queries";

describe("time entry actions", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  const base = {
    date: "2026-04-15",
    hours: 3,
    description: "Consulting",
    billable: true,
  };

  it("creates a billable entry (stored as 1)", async () => {
    const row = await _createTimeEntry(db, base);
    expect(row.hours).toBe(3);
    expect(row.billable).toBe(1);
  });

  it("can create a non-billable entry", async () => {
    const row = await _createTimeEntry(db, { ...base, billable: false });
    expect(row.billable).toBe(0);
  });

  it("rejects hours > 24", async () => {
    await expect(_createTimeEntry(db, { ...base, hours: 25 })).rejects.toThrow();
  });

  it("rejects empty description", async () => {
    await expect(
      _createTimeEntry(db, { ...base, description: "" }),
    ).rejects.toThrow();
  });

  it("updates billable flag round-trip", async () => {
    const row = await _createTimeEntry(db, base);
    const updated = await _updateTimeEntry(db, row.id, { billable: false });
    expect(updated!.billable).toBe(0);
  });

  it("deletes a row", async () => {
    const row = await _createTimeEntry(db, base);
    expect(await _deleteTimeEntry(db, row.id)).toBe(true);
  });

  it("nulls client_id when client is deleted", async () => {
    const clientId = crypto.randomUUID();
    await db.insert(clients).values({
      id: clientId,
      name: "C",
      company: null,
      email: "c@t.io",
      phone: null,
      industry: "other",
      status: "active",
      contractStartDate: "2026-01-01",
      mrrCents: null,
      fromLeadId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const row = await _createTimeEntry(db, { ...base, client_id: clientId });
    await db.delete(clients).where(eq(clients.id, clientId));
    const [after] = await db.select().from(timeEntries).where(eq(timeEntries.id, row.id));
    expect(after.clientId).toBeNull();
  });
});

describe("weeklyTotalHours", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("sums hours from Monday of the given week", async () => {
    // Wednesday 2026-04-15 → Monday 2026-04-13
    const ref = new Date("2026-04-15T10:00:00Z");
    const monday = startOfWeekIsoDate(ref);
    expect(monday).toBe("2026-04-13");

    await _createTimeEntry(db, { date: "2026-04-12", hours: 8, description: "prior week" });
    await _createTimeEntry(db, { date: "2026-04-13", hours: 4, description: "Mon" });
    await _createTimeEntry(db, { date: "2026-04-15", hours: 2.5, description: "Wed" });

    expect(await weeklyTotalHours(db, ref)).toBeCloseTo(6.5, 6);
  });

  it("returns 0 with no entries", async () => {
    expect(await weeklyTotalHours(db, new Date("2026-04-15T10:00:00Z"))).toBe(0);
  });
});
