import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { leads, proposals } from "@/db/schema";
import { _updateProposalStatus } from "@/lib/agents/proposals/actions";
import { isValidProposalTransition } from "@/lib/agents/proposals/status";

async function insertLead(db: TestDb) {
  const id = crypto.randomUUID();
  await db.insert(leads).values({
    id,
    name: "L",
    company: null,
    email: `${id}@t.io`,
    phone: null,
    industry: "other",
    source: "inbound",
    stage: "new",
    estimatedValueCents: null,
    followUpDate: null,
    convertedAt: null,
    convertedClientId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return id;
}

async function insertProposal(db: TestDb, leadId: string) {
  const id = crypto.randomUUID();
  const ts = Date.now();
  await db.insert(proposals).values({
    id,
    leadId,
    title: "p",
    body: "body",
    version: 1,
    status: "draft",
    sentAt: null,
    respondedAt: null,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

describe("isValidProposalTransition", () => {
  it("draft → sent", () => expect(isValidProposalTransition("draft", "sent")).toBe(true));
  it("sent → accepted / rejected", () => {
    expect(isValidProposalTransition("sent", "accepted")).toBe(true);
    expect(isValidProposalTransition("sent", "rejected")).toBe(true);
  });
  it("draft → accepted (invalid)", () =>
    expect(isValidProposalTransition("draft", "accepted")).toBe(false));
  it("accepted is terminal", () => {
    expect(isValidProposalTransition("accepted", "rejected")).toBe(false);
    expect(isValidProposalTransition("accepted", "draft")).toBe(false);
  });
  it("rejected is terminal", () => {
    expect(isValidProposalTransition("rejected", "accepted")).toBe(false);
  });
});

describe("_updateProposalStatus", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("sets sent_at when transitioning to sent", async () => {
    const leadId = await insertLead(db);
    const pid = await insertProposal(db, leadId);
    const row = await _updateProposalStatus(db, pid, "sent");
    expect(row!.status).toBe("sent");
    expect(row!.sentAt).toBeGreaterThan(0);
    expect(row!.respondedAt).toBeNull();
  });

  it("sets responded_at when transitioning to accepted", async () => {
    const leadId = await insertLead(db);
    const pid = await insertProposal(db, leadId);
    await _updateProposalStatus(db, pid, "sent");
    const row = await _updateProposalStatus(db, pid, "accepted");
    expect(row!.status).toBe("accepted");
    expect(row!.respondedAt).toBeGreaterThan(0);
  });

  it("rejects invalid transitions", async () => {
    const leadId = await insertLead(db);
    const pid = await insertProposal(db, leadId);
    await expect(_updateProposalStatus(db, pid, "accepted")).rejects.toThrow(
      "INVALID_TRANSITION",
    );
  });

  it("accepted is terminal", async () => {
    const leadId = await insertLead(db);
    const pid = await insertProposal(db, leadId);
    await _updateProposalStatus(db, pid, "sent");
    await _updateProposalStatus(db, pid, "accepted");
    await expect(_updateProposalStatus(db, pid, "rejected")).rejects.toThrow(
      "INVALID_TRANSITION",
    );
  });

  it("returns null for unknown proposal id", async () => {
    expect(await _updateProposalStatus(db, "missing", "sent")).toBeNull();
  });
});
