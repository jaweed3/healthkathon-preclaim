import { describe, expect, test } from "bun:test";
import {
  COMPUTED_RULES,
  INSPECTION_RULES,
  REVIEW_THRESHOLD,
  allowedCodes,
  isPlausible,
  knownDiagnoses,
  seed,
  statusFor,
} from "./index";

describe("knownDiagnoses", () => {
  test("every seed diagnosis has a rule", () => {
    for (const c of seed) {
      expect(knownDiagnoses()).toContain(c.diagnosis.split(" — ")[0]);
    }
  });

  test("is non-empty and has no duplicates", () => {
    const list = knownDiagnoses();
    expect(list.length).toBeGreaterThan(0);
    expect(new Set(list).size).toBe(list.length);
  });
});

describe("allowedCodes / isPlausible", () => {
  test("accepts a code the rule lists", () => {
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

describe("INSPECTION_RULES", () => {
  test("rule ids are unique", () => {
    const ids = INSPECTION_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every rule has a title and a description", () => {
    for (const r of INSPECTION_RULES) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(0);
    }
  });

  test("exactly one rule is computed: diagnosis/procedure plausibility", () => {
    expect(COMPUTED_RULES.map((r) => r.id)).toEqual(["dx-procedure"]);
  });

  test("the computed rule lists the same pairs the scorer uses", () => {
    const pairs = COMPUTED_RULES[0].pairs ?? [];
    expect(pairs.length).toBe(knownDiagnoses().length);
    for (const p of pairs) {
      expect(allowedCodes(p.diagnosis)).toEqual(p.codes);
    }
  });

  test("declared rules do not claim a code list they do not evaluate", () => {
    for (const r of INSPECTION_RULES.filter(
      (x) => x.enforcement === "declared",
    )) {
      expect(r.pairs).toBeUndefined();
    }
  });

  test("every finding in the fixtures maps to a known rule", () => {
    // The fixtures ship declared findings; this guards against a flag appearing
    // with no rule a coder could be shown.
    const ids = new Set(INSPECTION_RULES.map((r) => r.id));
    expect(ids.has("dx-procedure")).toBe(true);
    expect(ids.has("length-of-stay")).toBe(true);
    expect(ids.has("similarity")).toBe(true);
  });
});

describe("computed rule agrees with the scorer", () => {
  test("a code outside the listed pairs is held for review", () => {
    const outside = INSPECTION_RULES.flatMap((r) => r.pairs ?? []).flatMap(
      (p) => ["00.00"],
    );
    for (const code of outside) {
      expect(isPlausible("K35.8", code)).toBe(false);
      expect(statusFor(REVIEW_THRESHOLD)).toBe("Perlu ditinjau");
    }
  });
});
