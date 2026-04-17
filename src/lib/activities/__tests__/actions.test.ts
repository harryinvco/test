import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { _createLead, _deleteLead } from "@/lib/leads/actions";
import { _addActivity, _deleteActivity } from "@/lib/activities/actions";
import { activities } from "@/db/schema";

describe("activity actions (core)", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  const leadInput = {
    name: "Harry",
    email: "h@i.co",
    industry: "retail" as const,
    source: "inbound" as const,
    stage: "new" as const,
  };

  it("_addActivity inserts for a lead", async () => {
    const lead = await _createLead(db, leadInput);
    const act = await _addActivity(db, {
      lead_id: lead.id,
      type: "call",
      body: "first call",
      occurred_at_ms: Date.now(),
    });
    expect(act.leadId).toBe(lead.id);
    expect(act.type).toBe("call");
  });

  it("_deleteActivity removes", async () => {
    const lead = await _createLead(db, leadInput);
    const act = await _addActivity(db, {
      lead_id: lead.id,
      type: "note",
      body: "x",
      occurred_at_ms: Date.now(),
    });
    expect(await _deleteActivity(db, act.id)).toBe(true);
  });

  it("cascade: deleting a lead deletes its activities", async () => {
    const lead = await _createLead(db, leadInput);
    await _addActivity(db, { lead_id: lead.id, type: "note", body: "a", occurred_at_ms: Date.now() });
    await _addActivity(db, { lead_id: lead.id, type: "note", body: "b", occurred_at_ms: Date.now() });
    await _deleteLead(db, lead.id);
    const rows = await db.select().from(activities);
    expect(rows).toEqual([]);
  });
});
