import { describe, expect, test } from "bun:test";
import {
  CLAIM_STATUS,
  REVIEW_THRESHOLD,
  codeOf,
  flagsFor,
  scoreClaim,
  statusFor,
  seed,
} from "./index";
import type { Claim } from "./index";

const claim = (over: Partial<Claim> = {}): Claim => ({
  ...seed[0],
  diagnosis: "K35.8 — Apendisitis akut",
  procedure: "47.09 — Apendektomi lainnya",
  score: 78,
  status: CLAIM_STATUS.review,
  ...over,
});

describe("codeOf", () => {
  test("strips the label from a coded procedure", () => {
    expect(codeOf("47.09 — Apendektomi lainnya")).toBe("47.09");
  });

  test("passes a bare code through unchanged", () => {
    expect(codeOf("47.09")).toBe("47.09");
  });
});

describe("scoreClaim", () => {
  test("is deterministic for the same input", () => {
    expect(scoreClaim(claim(), "47.11")).toBe(scoreClaim(claim(), "47.11"));
  });

  test("gives different codes different scores", () => {
    expect(scoreClaim(claim(), "47.09")).not.toBe(scoreClaim(claim(), "47.12"));
  });

  test("scores an implausible code as high risk", () => {
    // 99.04 is plausible for A09, not for appendicitis.
    expect(scoreClaim(claim(), "99.04")).toBeGreaterThanOrEqual(
      REVIEW_THRESHOLD,
    );
  });

  test("scores a plausible code below the review threshold", () => {
    expect(scoreClaim(claim(), "47.09")).toBeLessThan(REVIEW_THRESHOLD);
  });

  test("treats an empty code as implausible", () => {
    expect(scoreClaim(claim(), "")).toBeGreaterThanOrEqual(REVIEW_THRESHOLD);
  });
});

describe("the revision flow cannot launder a claim", () => {
  // The defect this guards: `correct()` used to hardcode score 12 and empty
  // flags, so any code turned any claim green regardless of plausibility.
  test("every wrong code leaves the claim in review", () => {
    for (const code of ["", "99.04", "93.96", "47.99", "zzz"]) {
      const score = scoreClaim(claim(), code);
      expect(statusFor(score)).toBe(CLAIM_STATUS.review);
    }
  });

  test("a plausible code clears the claim", () => {
    expect(statusFor(scoreClaim(claim(), "47.09"))).toBe(CLAIM_STATUS.ready);
  });

  test("flagsFor agrees with scoreClaim about plausibility", () => {
    expect(flagsFor(claim(), "99.04")).toHaveLength(1);
    expect(flagsFor(claim(), "47.09")).toHaveLength(0);
  });
});

describe("statusFor", () => {
  test("treats the threshold as review", () => {
    expect(statusFor(REVIEW_THRESHOLD)).toBe(CLAIM_STATUS.review);
  });

  test("treats just below the threshold as ready", () => {
    expect(statusFor(REVIEW_THRESHOLD - 1)).toBe(CLAIM_STATUS.ready);
  });
});

describe("the status vocabulary", () => {
  test("every seed claim uses a canonical status", () => {
    const allowed = Object.values(CLAIM_STATUS);
    for (const c of seed) expect(allowed).toContain(c.status);
  });

  test("no legacy English status survives in the seed", () => {
    const legacy = ["review", "ready", "approved"];
    for (const c of seed) expect(legacy).not.toContain(c.status);
  });
});
