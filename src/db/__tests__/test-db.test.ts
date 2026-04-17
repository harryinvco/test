import { describe, it, expect } from "vitest";
import { makeTestDb } from "./test-db";
import { leads, clients, activities } from "@/db/schema";

describe("makeTestDb", () => {
  it("creates a clean in-memory DB with all 3 tables", async () => {
    const db = await makeTestDb();
    const l = await db.select().from(leads);
    const c = await db.select().from(clients);
    const a = await db.select().from(activities);
    expect(l).toEqual([]);
    expect(c).toEqual([]);
    expect(a).toEqual([]);
  });

  it("each call returns a fresh DB", async () => {
    const db1 = await makeTestDb();
    await db1.insert(leads).values({
      id: "l1",
      name: "A",
      email: "a@b.co",
      industry: "retail",
      source: "inbound",
      stage: "new",
      createdAt: 0,
      updatedAt: 0,
    });
    const db2 = await makeTestDb();
    const rows = await db2.select().from(leads);
    expect(rows).toEqual([]);
  });
});
