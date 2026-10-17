import { describe, expect, test } from "bun:test";
import {
  INSPECTION_RULES,
  REVIEW_THRESHOLD,
  evaluateAll,
  evaluateRules,
  isPlausible,
  knownDiagnoses,
  recomputeRule,
  replaceFlagsForRule,
  seed,
} from "./index";
import type { Claim, Flag } from "./index";

const claim = (over: Partial<Claim> = {}): Claim => ({
  ...seed[0],
  id: "CLM-TEST-001",
  diagnosis: "K35.8 — Apendisitis akut",
  procedure: "47.09 — Apendektomi lainnya",
  length: "4 hari",
  score: 18,
  flags: [],
  ...over,
});

const ruleIds = (flags: Flag[]) => flags.map((f) => f.ruleId).sort();

describe("rule metadata", () => {
  test("every rule is versioned and sourced", () => {
    for (const r of INSPECTION_RULES) {
      expect(r.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(r.source.length).toBeGreaterThan(0);
      expect(typeof r.evaluate).toBe("function");
    }
  });

  test("rule ids are unique", () => {
    const ids = INSPECTION_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the three claimed core capabilities are all executable", () => {
    const ids = INSPECTION_RULES.map((r) => r.id);
    expect(ids).toContain("dx-procedure");
    expect(ids).toContain("missing-evidence");
    expect(ids).toContain("similarity");
  });
});

describe("each rule only emits its own flags", () => {
  for (const rule of INSPECTION_RULES) {
    test(`${rule.id}`, () => {
      const c = claim();
      for (const f of rule.evaluate({ claim: c, claims: [c] })) {
        expect(f.ruleId).toBe(rule.id);
      }
    });
  }
});

describe("dx-procedure", () => {
  test("flags an implausible pair", () => {
    const flags = evaluateRules({
      claim: claim({ procedure: "99.04 — Transfusi" }),
      claims: [],
    });
    expect(flags.some((f) => f.ruleId === "dx-procedure")).toBe(true);
  });

  test("silent on a plausible pair", () => {
    const flags = evaluateRules({ claim: claim(), claims: [] });
    expect(flags.some((f) => f.ruleId === "dx-procedure")).toBe(false);
  });
});

describe("length-of-stay", () => {
  test("flags a stay longer than typical", () => {
    const flags = evaluateRules({
      claim: claim({ length: "11 hari" }),
      claims: [],
    });
    expect(flags.some((f) => f.ruleId === "length-of-stay")).toBe(true);
  });

  test("silent within the typical range", () => {
    const flags = evaluateRules({
      claim: claim({ length: "3 hari" }),
      claims: [],
    });
    expect(flags.some((f) => f.ruleId === "length-of-stay")).toBe(false);
  });

  test("unknown diagnosis produces no verdict rather than a false finding", () => {
    const flags = evaluateRules({
      claim: claim({ diagnosis: "ZZZ.9 — Tidak dikenal" }),
      claims: [],
    });
    expect(flags.some((f) => f.ruleId === "length-of-stay")).toBe(false);
  });
});

describe("missing-evidence", () => {
  test("flags an invasive code with no documents", () => {
    const flags = evaluateRules({
      claim: claim({ documents: [] }),
      claims: [],
    });
    expect(flags.some((f) => f.ruleId === "missing-evidence")).toBe(true);
  });

  test("silent once a document is recorded", () => {
    const flags = evaluateRules({
      claim: claim({ documents: ["Resume medis"] }),
      claims: [],
    });
    expect(flags.some((f) => f.ruleId === "missing-evidence")).toBe(false);
  });

  test("ignores non-invasive codes", () => {
    const flags = evaluateRules({
      claim: claim({ procedure: "93.96 — Terapi respirasi", documents: [] }),
      claims: [],
    });
    expect(flags.some((f) => f.ruleId === "missing-evidence")).toBe(false);
  });
});

describe("similarity", () => {
  test("flags a near-identical claim", () => {
    const a = claim({ id: "CLM-A" });
    const b = claim({ id: "CLM-B" });
    const flags = evaluateRules({ claim: a, claims: [a, b] });
    expect(flags.some((f) => f.ruleId === "similarity")).toBe(true);
  });

  test("stays quiet on claims that differ", () => {
    const a = claim({
      id: "CLM-A",
      diagnosis: "K35.8 — Apendisitis akut",
      length: "4 hari",
    });
    const b = claim({
      id: "CLM-B",
      diagnosis: "A09 — Gastroenteritis",
      procedure: "99.04 — Transfusi",
      length: "1 hari",
    });
    const flags = evaluateRules({ claim: a, claims: [a, b] });
    expect(flags.some((f) => f.ruleId === "similarity")).toBe(false);
  });

  test("never compares a claim to itself", () => {
    const a = claim({ id: "CLM-A" });
    const flags = evaluateRules({ claim: a, claims: [a] });
    expect(flags.some((f) => f.ruleId === "similarity")).toBe(false);
  });
});

describe("replaceFlagsForRule — the revision-wipes-flags defect", () => {
  const dxFlag: Flag = {
    ruleId: "dx-procedure",
    message: "dx",
    severity: "warn",
  };
  const simFlag: Flag = {
    ruleId: "similarity",
    message: "sim",
    severity: "warn",
  };

  test("replaces only the named rule", () => {
    const out = replaceFlagsForRule([dxFlag, simFlag], "dx-procedure", []);
    expect(ruleIds(out)).toEqual(["similarity"]);
  });

  test("leaves other rules untouched when one fires", () => {
    const out = replaceFlagsForRule([simFlag], "dx-procedure", [dxFlag]);
    expect(ruleIds(out)).toEqual(["dx-procedure", "similarity"]);
  });

  test("does not mutate the input", () => {
    const input = [dxFlag, simFlag];
    replaceFlagsForRule(input, "dx-procedure", []);
    expect(input).toHaveLength(2);
  });

  test("a code fix clears the dx finding but keeps similarity", () => {
    const before = [dxFlag, simFlag];
    const after = replaceFlagsForRule(before, "dx-procedure", []);
    expect(after.some((f) => f.ruleId === "dx-procedure")).toBe(false);
    expect(after.some((f) => f.ruleId === "similarity")).toBe(true);
  });
});

describe("recomputeRule", () => {
  test("patches one rule across every claim", () => {
    const claims = evaluateAll(seed);
    const dup = claims.find((c) => c.id === "CLM-240918-020")!;
    expect(dup.flags.some((f) => f.ruleId === "similarity")).toBe(true);

    // Fixing dx-procedure everywhere must not erase the similarity findings.
    const after = recomputeRule(claims, "dx-procedure");
    const patched = after.find((c) => c.id === "CLM-240918-020")!;
    expect(patched.flags.some((f) => f.ruleId === "similarity")).toBe(true);
  });

  test("ignores an unknown rule id", () => {
    expect(recomputeRule(seed, "nope")).toBe(seed);
  });
});

describe("evaluateAll", () => {
  test("is idempotent — running it again changes nothing", () => {
    const once = evaluateAll(seed);
    const twice = evaluateAll(once);
    for (const claim of twice) {
      const before = once.find((c) => c.id === claim.id)!;
      expect(ruleIds(claim.flags)).toEqual(ruleIds(before.flags));
    }
  });

  test("every fixture flag is attributable to a real rule", () => {
    const known = new Set(INSPECTION_RULES.map((r) => r.id));
    for (const c of seed) {
      for (const f of c.flags) expect(known.has(f.ruleId)).toBe(true);
    }
  });

  test("no fixture references a claim that is not in the dataset", () => {
    const ids = new Set(seed.map((c) => c.id));
    for (const c of seed) {
      for (const m of c.flags
        .map((f) => f.message)
        .join(" ")
        .matchAll(/CLM-[\w-]+/g)) {
        expect(ids.has(m[0])).toBe(true);
      }
    }
  });
});

describe("knownDiagnoses", () => {
  test("covers every seeded diagnosis", () => {
    for (const c of seed) {
      expect(knownDiagnoses()).toContain(c.diagnosis.split(" — ")[0]);
    }
  });

  test("an unknown code is not plausible with anything", () => {
    expect(isPlausible("ZZZ.9", "47.09")).toBe(false);
  });
});

describe("threshold", () => {
  test("is the same value the app filters on", () => {
    expect(REVIEW_THRESHOLD).toBe(60);
  });
});
