import { describe, expect, test } from "bun:test";
import {
  AuditEntrySchema,
  AuditLogSchema,
  CLAIM_STATUS,
  ClaimSchema,
  ClaimStatusSchema,
  seed,
} from "./index";

describe("ClaimStatusSchema", () => {
  test("accepts every canonical status", () => {
    for (const s of Object.values(CLAIM_STATUS))
      expect(ClaimStatusSchema.parse(s)).toBe(s);
  });

  test("rejects the legacy English vocabulary", () => {
    for (const s of ["review", "ready", "approved"])
      expect(ClaimStatusSchema.safeParse(s).success).toBe(false);
  });

  test("rejects a near-miss status string", () => {
    expect(ClaimStatusSchema.safeParse("perlu ditinjau").success).toBe(false);
  });
});

describe("ClaimSchema", () => {
  test("every seed claim satisfies the schema", () => {
    expect(() => ClaimSchema.array().parse(seed)).not.toThrow();
  });

  test("rejects an out-of-range score", () => {
    const bad = { ...seed[0], score: 140 };
    expect(ClaimSchema.safeParse(bad).success).toBe(false);
  });

  test("rejects a negative score", () => {
    expect(ClaimSchema.safeParse({ ...seed[0], score: -1 }).success).toBe(
      false,
    );
  });

  test("rejects an empty claim id", () => {
    expect(ClaimSchema.safeParse({ ...seed[0], id: "" }).success).toBe(false);
  });

  test("rejects a claim carrying an unvalidated status", () => {
    expect(
      ClaimSchema.safeParse({ ...seed[0], status: "Disetujui extra" }).success,
    ).toBe(false);
  });

  test("rejects a revision with a blank justification", () => {
    const withBlankReason = {
      ...seed[0],
      revisions: [
        {
          at: new Date().toISOString(),
          from: "47.09",
          to: "47.11",
          reason: "   ",
          evidence: true,
          previousScore: 78,
          newScore: 26,
        },
      ],
    };
    expect(ClaimSchema.safeParse(withBlankReason).success).toBe(false);
  });

  test("rejects a revision timestamp that is not a datetime", () => {
    const bad = {
      ...seed[0],
      revisions: [
        {
          at: "yesterday",
          from: "47.09",
          to: "47.11",
          reason: "ok",
          evidence: true,
          previousScore: 78,
          newScore: 26,
        },
      ],
    };
    expect(ClaimSchema.safeParse(bad).success).toBe(false);
  });
});

describe("AuditLogSchema", () => {
  const entry = {
    claimId: "CLM-240918-021",
    patient: "Pasien A-104",
    at: new Date().toISOString(),
    revisions: [
      {
        at: new Date().toISOString(),
        from: "47.09",
        to: "47.11",
        reason: "Resume medis mendukung apendektomi.",
        evidence: true,
        previousScore: 78,
        newScore: 26,
      },
    ],
  };

  test("accepts a well-formed log", () => {
    expect(() => AuditLogSchema.parse([entry])).not.toThrow();
  });

  test("accepts an empty log", () => {
    expect(AuditLogSchema.parse([])).toEqual([]);
  });

  test("rejects a log that is not an array", () => {
    expect(AuditLogSchema.safeParse({ entries: [] }).success).toBe(false);
  });

  test("rejects an entry with a missing claim id", () => {
    expect(
      AuditEntrySchema.safeParse({ ...entry, claimId: undefined }).success,
    ).toBe(false);
  });

  test("rejects an entry whose revisions are not a list", () => {
    expect(
      AuditEntrySchema.safeParse({ ...entry, revisions: "none" }).success,
    ).toBe(false);
  });

  test("rejects a tampered revision with no evidence flag", () => {
    const tampered = {
      ...entry,
      revisions: [{ ...entry.revisions[0], evidence: "yes" }],
    };
    expect(AuditEntrySchema.safeParse(tampered).success).toBe(false);
  });
});
