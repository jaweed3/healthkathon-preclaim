import { describe, expect, test } from "bun:test";
import {
  CLAIM_STATUS,
  averageScore,
  codeOf,
  evaluateAll,
  evaluateRules,
  isPlausible,
  knownDiagnoses,
  allowedCodes,
  recomputeRule,
  replaceFlagsForRule,
  readinessFor,
  REVIEW_THRESHOLD,
  scoreFor,
  scoreTone,
  statusFor,
} from "../../packages/core/src/index";
import type { Claim, Flag } from "../../packages/core/src/index";

const warn = (ruleId: string): Flag => ({
  ruleId,
  message: "m",
  reason: "m",
  source: "test",
  evidence: ["fixture"],
  severity: "warn",
});
const info = (ruleId: string): Flag => ({
  ruleId,
  message: "m",
  reason: "m",
  source: "test",
  evidence: ["fixture"],
  severity: "info",
});

const claim = (over: Partial<Claim> = {}): Claim => ({
  id: "CLM-TEST-001",
  patient: "Pasien X",
  service: "Rawat inap",
  date: "18 Sep 2026",
  amount: "Rp 1.000.000",
  status: CLAIM_STATUS.review,
  score: 0,
  readiness: 0,
  diagnosis: "K35.8 — Apendisitis akut",
  procedure: "47.09 — Apendektomi lainnya",
  length: "4 hari",
  flags: [],
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

describe("isPlausible", () => {
  test("accepts a code the table lists", () => {
    expect(isPlausible("K35.8", "47.09")).toBe(true);
  });

  test("rejects a code belonging to another diagnosis", () => {
    expect(isPlausible("K35.8", "99.04")).toBe(false);
  });

  test("rejects an unknown diagnosis rather than defaulting to allowed", () => {
    expect(isPlausible("ZZZ.9", "47.09")).toBe(false);
    expect(allowedCodes("ZZZ.9")).toEqual([]);
  });

  test("rejects an empty code", () => {
    expect(isPlausible("K35.8", "")).toBe(false);
  });
});

describe("scoreFor", () => {
  test("a claim with no findings scores low but not zero", () => {
    expect(scoreFor([])).toBeGreaterThan(0);
    expect(scoreFor([])).toBeLessThan(REVIEW_THRESHOLD);
  });

  test("rises monotonically with the number of findings", () => {
    expect(scoreFor([warn("length-of-stay")])).toBeLessThan(
      scoreFor([warn("length-of-stay"), warn("similarity")]),
    );
  });

  test("a diagnosis mismatch outweighs the other rules", () => {
    expect(scoreFor([warn("dx-procedure")])).toBeGreaterThan(
      scoreFor([warn("similarity")]),
    );
  });

  test("an unknown rule still contributes something", () => {
    expect(scoreFor([warn("who-knows")])).toBeGreaterThan(scoreFor([]));
  });

  test("never exceeds 100", () => {
    const many = [
      "dx-procedure",
      "similarity",
      "length-of-stay",
      "missing-evidence",
    ].map(warn);
    expect(scoreFor(many)).toBeLessThanOrEqual(100);
  });

  test("info-level findings score below warn-level", () => {
    expect(scoreFor([info("missing-evidence")])).toBeLessThan(
      scoreFor([warn("similarity")]),
    );
  });
});

describe("readinessFor", () => {
  test("uses the same findings but distinguishes blockers from advisories", () => {
    expect(readinessFor([])).toBe(100);
    expect(readinessFor([warn("dx-procedure")])).toBe(60);
    expect(readinessFor([warn("dx-procedure"), info("missing-evidence")])).toBe(
      50,
    );
  });
});

describe("statusFor", () => {
  test("any warning holds the claim for review even at a low score", () => {
    // The defect this guards: score came from plausibility alone, so a claim
    // with an active similarity warning read as 18/100 "Aman".
    expect(
      statusFor(scoreFor([warn("similarity")]), [warn("similarity")]),
    ).toBe(CLAIM_STATUS.review);
  });

  test("no findings and a low score is ready", () => {
    expect(statusFor(scoreFor([]), [])).toBe(CLAIM_STATUS.ready);
  });

  test("no findings but a high score is still review", () => {
    expect(statusFor(95, [])).toBe(CLAIM_STATUS.review);
  });
});

describe("score and findings cannot disagree", () => {
  test("every fixture claim has a score consistent with its flags", () => {
    for (const c of evaluateAll(fixtures())) {
      expect(c.score).toBe(scoreFor(c.flags));
    }
  });

  test("every fixture claim with a warning is in review", () => {
    for (const c of evaluateAll(fixtures())) {
      if (c.flags.some((f) => f.severity === "warn")) {
        expect(c.status).toBe(CLAIM_STATUS.review);
      }
    }
  });

  test("a clean fixture claim is ready to send", () => {
    const clean = evaluateAll(fixtures()).find((c) => c.flags.length === 0);
    expect(clean).toBeDefined();
    expect(clean!.status).toBe(CLAIM_STATUS.ready);
  });
});

describe("scoring survives a revision", () => {
  test("fixing the code drops the dx finding and the score with it", () => {
    const claims = evaluateAll(fixtures());
    const target = claims.find((c) =>
      c.flags.some((f) => f.ruleId === "dx-procedure"),
    )!;
    expect(target.score).toBeGreaterThan(REVIEW_THRESHOLD);

    const fixed = {
      ...target,
      procedure: allowedCodes(codeOf(target.diagnosis))[0],
    };
    const next = recomputeRule([fixed], "dx-procedure").map((c) => ({
      ...c,
      score: scoreFor(c.flags),
      status: statusFor(scoreFor(c.flags), c.flags),
    }));

    expect(next[0].flags.some((f) => f.ruleId === "dx-procedure")).toBe(false);
    expect(next[0].score).toBeLessThan(target.score);
  });

  test("an unrelated finding survives the revision", () => {
    const claims = evaluateAll(fixtures());
    const dup = claims.filter((c) =>
      c.flags.some((f) => f.ruleId === "similarity"),
    );
    expect(dup.length).toBeGreaterThan(0);

    const after = recomputeRule(claims, "dx-procedure");
    for (const c of after) {
      const before = claims.find((x) => x.id === c.id)!;
      const wasSimilar = before.flags.some((f) => f.ruleId === "similarity");
      expect(c.flags.some((f) => f.ruleId === "similarity")).toBe(wasSimilar);
    }
  });
});

describe("replaceFlagsForRule", () => {
  test("replaces only the named rule", () => {
    expect(
      replaceFlagsForRule(
        [warn("dx-procedure"), warn("similarity")],
        "dx-procedure",
        [],
      ),
    ).toEqual([warn("similarity")]);
  });

  test("does not mutate the input", () => {
    const input = [warn("dx-procedure"), warn("similarity")];
    replaceFlagsForRule(input, "dx-procedure", []);
    expect(input).toHaveLength(2);
  });

  test("an unknown rule id leaves the list untouched", () => {
    const input = [warn("similarity")];
    expect(replaceFlagsForRule(input, "nope", [warn("dx-procedure")])).toEqual(
      input,
    );
  });
});

describe("helpers", () => {
  test("knownDiagnoses has no duplicates", () => {
    const list = knownDiagnoses();
    expect(new Set(list).size).toBe(list.length);
  });

  test("scoreTone follows the threshold", () => {
    expect(scoreTone(REVIEW_THRESHOLD)).toBe("high");
    expect(scoreTone(0)).toBe("low");
  });

  test("averageScore of nothing is zero, not NaN", () => {
    expect(averageScore([])).toBe(0);
  });

  test("evaluateRules is deterministic", () => {
    const c = claim();
    expect(evaluateRules({ claim: c, claims: [c] })).toEqual(
      evaluateRules({ claim: c, claims: [c] }),
    );
  });
});

/** Local copy so scoring tests do not depend on the exported fixture. */
function fixtures(): Claim[] {
  return [
    claim({ id: "F1", procedure: "99.04 — Transfusi", documents: [] }),
    claim({
      id: "F2",
      diagnosis: "A09 — Gastroenteritis",
      procedure: "99.04 — Transfusi",
      documents: ["Resume"],
    }),
    claim({
      id: "F3",
      diagnosis: "A09 — Gastroenteritis",
      procedure: "99.04 — Transfusi",
      documents: ["Resume"],
    }),
    claim({
      id: "F4",
      diagnosis: "J18.9 — Pneumonia",
      procedure: "93.90 — Ventilasi",
      length: "9 hari",
    }),
    claim({
      id: "F5",
      diagnosis: "I10 — Hipertensi",
      procedure: "93.96 — Terapi",
      length: "0 hari",
      documents: ["Catatan"],
    }),
  ];
}
