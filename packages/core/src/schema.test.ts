import { describe, expect, test } from "bun:test";
import {
  AuditEntrySchema,
  AuditLogSchema,
  CLAIM_STATUS,
  ClaimSchema,
  ClaimStatusSchema,
  seed,
} from "./index";

const revisionEvent = {
  kind: "revision" as const,
  at: new Date().toISOString(),
  from: "47.09",
  to: "47.11",
  reason: "Resume medis mendukung apendektomi.",
  evidence: true,
  previousScore: 78,
  newScore: 26,
};

const auditEntry = {
  claimId: "CLM-240918-021",
  patient: "Pasien A-104",
  at: new Date().toISOString(),
  events: [revisionEvent],
};

describe("ClaimStatusSchema", () => {
  test("accepts every canonical status", () => {
    for (const s of Object.values(CLAIM_STATUS))
      expect(ClaimStatusSchema.parse(s)).toBe(s);
  });

  test("rejects the legacy English vocabulary", () => {
    for (const s of ["review", "ready", "approved"]) {
      expect(ClaimStatusSchema.safeParse(s).success).toBe(false);
    }
  });

  test("rejects a near-miss status string", () => {
    expect(ClaimStatusSchema.safeParse("perlu ditinjau").success).toBe(false);
  });

  test("has a distinct status for a justified approval", () => {
    // A claim approved with a note must be distinguishable from one approved bare.
    expect(CLAIM_STATUS.approvedWithNote).not.toBe(CLAIM_STATUS.approved);
  });
});

describe("ClaimSchema", () => {
  test("every fixture claim satisfies the schema", () => {
    expect(() => ClaimSchema.array().parse(seed)).not.toThrow();
  });

  test("rejects an out-of-range score", () => {
    expect(ClaimSchema.safeParse({ ...seed[0], score: 140 }).success).toBe(
      false,
    );
  });

  test("rejects a negative score", () => {
    expect(ClaimSchema.safeParse({ ...seed[0], score: -1 }).success).toBe(
      false,
    );
  });

  test("rejects an empty claim id", () => {
    expect(ClaimSchema.safeParse({ ...seed[0], id: "" }).success).toBe(false);
  });

  test("rejects a whitespace-only claim id", () => {
    expect(ClaimSchema.safeParse({ ...seed[0], id: "   " }).success).toBe(
      false,
    );
  });

  test("rejects a claim carrying an unvalidated status", () => {
    expect(
      ClaimSchema.safeParse({ ...seed[0], status: "Disetujui extra" }).success,
    ).toBe(false);
  });

  test("rejects a flag with no rule attribution", () => {
    const bad = { ...seed[0], flags: [{ message: "x", severity: "warn" }] };
    expect(ClaimSchema.safeParse(bad).success).toBe(false);
  });

  test("accepts a revision with a justification", () => {
    expect(
      ClaimSchema.safeParse({ ...seed[0], history: [revisionEvent] }).success,
    ).toBe(true);
  });

  test("rejects a revision with a blank justification", () => {
    const bad = { ...seed[0], history: [{ ...revisionEvent, reason: "   " }] };
    expect(ClaimSchema.safeParse(bad).success).toBe(false);
  });

  test("rejects a revision timestamp that is not a datetime", () => {
    const bad = {
      ...seed[0],
      history: [{ ...revisionEvent, at: "yesterday" }],
    };
    expect(ClaimSchema.safeParse(bad).success).toBe(false);
  });

  test("rejects an approval with no note", () => {
    const bad = {
      ...seed[0],
      history: [
        {
          kind: "approval" as const,
          at: new Date().toISOString(),
          note: "  ",
          score: 78,
          findingsAtApproval: [],
        },
      ],
    };
    expect(ClaimSchema.safeParse(bad).success).toBe(false);
  });

  test("accepts an approval that records the findings it overrode", () => {
    const approval = {
      kind: "approval" as const,
      at: new Date().toISOString(),
      note: "Duplikasi administratif, sudah diverifikasi.",
      score: 42,
      findingsAtApproval: [
        {
          ruleId: "similarity",
          message: "Kemiripan tinggi",
          reason: "Kemiripan tinggi",
          source: "fixture",
          evidence: ["CLM-1", "CLM-2"],
          severity: "warn" as const,
        },
      ],
    };
    expect(
      ClaimSchema.safeParse({ ...seed[0], history: [approval] }).success,
    ).toBe(true);
  });

  test("rejects a history event of unknown kind", () => {
    const bad = {
      ...seed[0],
      history: [{ kind: "delete", at: new Date().toISOString() }],
    };
    expect(ClaimSchema.safeParse(bad).success).toBe(false);
  });
});

describe("AuditLogSchema", () => {
  test("accepts a well-formed log", () => {
    expect(() => AuditLogSchema.parse([auditEntry])).not.toThrow();
  });

  test("accepts an empty log", () => {
    expect(AuditLogSchema.parse([])).toEqual([]);
  });

  test("rejects a log that is not an array", () => {
    expect(AuditLogSchema.safeParse({ entries: [] }).success).toBe(false);
  });

  test("rejects an entry with a missing claim id", () => {
    expect(
      AuditEntrySchema.safeParse({ ...auditEntry, claimId: undefined }).success,
    ).toBe(false);
  });

  test("rejects an entry whose events are not a list", () => {
    expect(
      AuditEntrySchema.safeParse({ ...auditEntry, events: "none" }).success,
    ).toBe(false);
  });

  test("rejects a tampered revision with no evidence flag", () => {
    const tampered = {
      ...auditEntry,
      events: [{ ...revisionEvent, evidence: "yes" }],
    };
    expect(AuditEntrySchema.safeParse(tampered).success).toBe(false);
  });

  test("rejects an audit event with an unknown kind", () => {
    const bad = {
      ...auditEntry,
      events: [{ kind: "delete", at: new Date().toISOString() }],
    };
    expect(AuditEntrySchema.safeParse(bad).success).toBe(false);
  });

  test("accepts a mixed log of revisions and approvals", () => {
    const approval = {
      kind: "approval" as const,
      at: new Date().toISOString(),
      note: "Duplikasi administratif.",
      score: 42,
      findingsAtApproval: [],
    };
    expect(() =>
      AuditLogSchema.parse([
        { ...auditEntry, events: [revisionEvent, approval] },
      ]),
    ).not.toThrow();
  });
});
