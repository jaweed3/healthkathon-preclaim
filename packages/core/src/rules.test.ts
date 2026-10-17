import { describe, expect, test } from "bun:test";
import {
  EVALUATOR_TYPES,
  INSPECTION_RULES,
  POLICY,
  REVIEW_THRESHOLD,
  allowedCodes,
  evaluateAll,
  evaluateRules,
  isPlausible,
  knownDiagnoses,
  recomputeRule,
  replaceFlagsForRule,
  ruleById,
  ruleByType,
  seed,
} from "./index";
import { RULE_EVALUATORS } from "./rules/engine";
import type { Claim, Flag } from "./index";

const claim = (over: Partial<Claim> = {}): Claim => ({
  id: "CLM-TEST-001",
  patient: "Pasien X",
  service: "Rawat inap",
  date: "18 Sep 2026",
  amount: "Rp 1.000.000",
  status: "Perlu ditinjau",
  score: 0,
  readiness: 0,
  diagnosis: "K35.8 — Apendisitis akut",
  procedure: "47.09 — Apendektomi lainnya",
  length: "4 hari",
  flags: [],
  ...over,
});

const ruleIds = (flags: Flag[]) => flags.map((f) => f.ruleId).sort();
const hasRule = (flags: Flag[], id: string) =>
  flags.some((f) => f.ruleId === id);

describe("the loaded policy", () => {
  test("is a valid, versioned rule set", () => {
    expect(POLICY.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(POLICY.rules.length).toBeGreaterThan(0);
  });

  test("every rule id, version and source is present", () => {
    for (const r of INSPECTION_RULES) {
      expect(r.id.length).toBeGreaterThan(0);
      expect(r.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(r.source.length).toBeGreaterThan(0);
    }
  });

  test("rule ids are unique", () => {
    const ids = INSPECTION_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every declared type has an evaluator", () => {
    for (const type of EVALUATOR_TYPES) {
      expect(typeof RULE_EVALUATORS[type]).toBe("function");
    }
  });

  test("no rule uses a type the engine does not implement", () => {
    for (const r of INSPECTION_RULES) {
      expect(EVALUATOR_TYPES).toContain(r.type);
    }
  });

  test("every rule is reachable by id", () => {
    for (const r of INSPECTION_RULES) expect(ruleById(r.id)).toBeDefined();
  });

  test("the policy ships exactly one rule per evaluator type", () => {
    const types = INSPECTION_RULES.map((r) => r.type);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe("policy is data, behaviour is fixed", () => {
  test("the plausibility table lives in the rule file, not in code", () => {
    const rule = ruleByType("dx_procedure");
    expect(rule?.type === "dx_procedure" && rule.params.pairs["K35.8"]).toEqual(
      ["47.09", "47.11", "47.12"],
    );
    expect(allowedCodes("K35.8")).toEqual(["47.09", "47.11", "47.12"]);
  });

  test("allowedCodes reads through the loaded policy", () => {
    expect(allowedCodes("A09")).toEqual(["99.04"]);
    expect(allowedCodes("ZZZ.9")).toEqual([]);
  });

  test("knownDiagnoses follows the policy table", () => {
    expect(knownDiagnoses().sort()).toEqual(["A09", "I10", "J18.9", "K35.8"]);
  });
});

describe("each rule only emits its own flags", () => {
  for (const rule of INSPECTION_RULES) {
    test(`${rule.id}`, () => {
      const c = claim();
      for (const f of RULE_EVALUATORS[rule.type](rule, {
        claim: c,
        claims: [c],
      })) {
        expect(f.ruleId).toBe(rule.id);
      }
    });
  }
});

describe("dx_procedure", () => {
  test("flags an implausible pair", () => {
    const flags = evaluateRules({
      claim: claim({ procedure: "99.04 — Transfusi" }),
      claims: [],
    });
    expect(hasRule(flags, "dx-procedure")).toBe(true);
  });

  test("silent on a plausible pair", () => {
    expect(
      hasRule(evaluateRules({ claim: claim(), claims: [] }), "dx-procedure"),
    ).toBe(false);
  });

  test("an unknown diagnosis is reported as uncheckable, not as a mismatch", () => {
    const flags = evaluateRules({
      claim: claim({ diagnosis: "ZZZ.9 — Asing" }),
      claims: [],
    });
    const dx = flags.find((f) => f.ruleId === "dx-procedure");

    expect(dx?.severity).toBe("info");
    expect(dx?.message).toContain("belum dikenal aturan");
  });
});

describe("los_threshold", () => {
  test("flags a stay longer than typical", () => {
    expect(
      hasRule(
        evaluateRules({ claim: claim({ length: "11 hari" }), claims: [] }),
        "length-of-stay",
      ),
    ).toBe(true);
  });

  test("silent within the typical range", () => {
    expect(
      hasRule(
        evaluateRules({ claim: claim({ length: "3 hari" }), claims: [] }),
        "length-of-stay",
      ),
    ).toBe(false);
  });

  test("unknown diagnosis yields no verdict rather than a false finding", () => {
    const flags = evaluateRules({
      claim: claim({ diagnosis: "ZZZ.9 — Asing" }),
      claims: [],
    });
    expect(hasRule(flags, "length-of-stay")).toBe(false);
  });
});

describe("required_evidence", () => {
  test("flags an invasive code with no documents", () => {
    expect(
      hasRule(
        evaluateRules({ claim: claim({ documents: [] }), claims: [] }),
        "missing-evidence",
      ),
    ).toBe(true);
  });

  test("silent once a document is recorded", () => {
    const c = claim({ documents: ["Resume medis"] });
    expect(
      hasRule(evaluateRules({ claim: c, claims: [] }), "missing-evidence"),
    ).toBe(false);
  });

  test("ignores codes outside the configured list", () => {
    const c = claim({ procedure: "93.96 — Terapi", documents: [] });
    expect(
      hasRule(evaluateRules({ claim: c, claims: [] }), "missing-evidence"),
    ).toBe(false);
  });
});

describe("similarity", () => {
  test("flags a near-identical claim", () => {
    const a = claim({ id: "CLM-A" });
    const b = claim({ id: "CLM-B" });
    expect(
      hasRule(evaluateRules({ claim: a, claims: [a, b] }), "similarity"),
    ).toBe(true);
  });

  test("stays quiet on claims that differ", () => {
    const a = claim({ id: "CLM-A" });
    const b = claim({
      id: "CLM-B",
      diagnosis: "A09 — Gastroenteritis",
      procedure: "99.04 — Transfusi",
      length: "1 hari",
    });
    expect(
      hasRule(evaluateRules({ claim: a, claims: [a, b] }), "similarity"),
    ).toBe(false);
  });

  test("never compares a claim to itself", () => {
    const a = claim({ id: "CLM-A" });
    expect(
      hasRule(evaluateRules({ claim: a, claims: [a] }), "similarity"),
    ).toBe(false);
  });
});

describe("icd10_primary_diagnosis — the myth, handled correctly", () => {
  // "Chapter R codes are never a principal diagnosis" is a documented myth:
  // ICD-10-CM I.C.18.a says symptom codes ARE acceptable as principal when no
  // definitive diagnosis has been established. The rule must therefore only
  // fire when a definitive diagnosis is also present.
  test("silent when no definitive diagnosis is recorded", () => {
    const c = claim({ diagnosis: "R10.4 — Nyeri perut bagian atas" });
    expect(
      hasRule(evaluateRules({ claim: c, claims: [] }), "icd10-ch18-primary"),
    ).toBe(false);
  });

  test("fires when a definitive diagnosis is also on the claim", () => {
    const c = claim({
      diagnosis: "R10.4 — Nyeri perut bagian atas",
      establishedDiagnoses: ["K35.8 — Apendisitis akut"],
    });
    expect(
      hasRule(evaluateRules({ claim: c, claims: [] }), "icd10-ch18-primary"),
    ).toBe(true);
  });

  test("does not fire on a non-R primary diagnosis", () => {
    const c = claim({
      diagnosis: "K35.8 — Apendisitis akut",
      establishedDiagnoses: ["K35.8"],
    });
    expect(
      hasRule(evaluateRules({ claim: c, claims: [] }), "icd10-ch18-primary"),
    ).toBe(false);
  });

  test("cites a public guideline as its source, not a local invention", () => {
    const rule = ruleById("icd10-ch18-primary");
    expect(rule?.source).toContain("I.C.18");
  });
});

describe("replaceFlagsForRule", () => {
  const dxFlag: Flag = {
    ruleId: "dx-procedure",
    message: "dx",
    reason: "dx",
    source: "test",
    evidence: ["fixture"],
    severity: "warn",
  };
  const simFlag: Flag = {
    ruleId: "similarity",
    message: "sim",
    reason: "sim",
    source: "test",
    evidence: ["fixture"],
    severity: "warn",
  };

  test("replaces only the named rule", () => {
    expect(replaceFlagsForRule([dxFlag, simFlag], "dx-procedure", [])).toEqual([
      simFlag,
    ]);
  });

  test("does not mutate the input", () => {
    const input = [dxFlag, simFlag];
    replaceFlagsForRule(input, "dx-procedure", []);
    expect(input).toHaveLength(2);
  });

  test("an unknown rule id leaves the list untouched", () => {
    const input = [simFlag];
    expect(replaceFlagsForRule(input, "nope", [dxFlag])).toEqual(input);
  });

  test("a code fix clears dx but keeps similarity", () => {
    const after = replaceFlagsForRule([dxFlag, simFlag], "dx-procedure", []);
    expect(hasRule(after, "dx-procedure")).toBe(false);
    expect(hasRule(after, "similarity")).toBe(true);
  });
});

describe("recomputeRule", () => {
  test("patches one rule without touching the others", () => {
    const claims = evaluateAll(seed);
    const dup = claims.find((c) => hasRule(c.flags, "similarity"))!;
    expect(dup).toBeDefined();

    const after = recomputeRule(claims, "dx-procedure");
    expect(
      hasRule(after.find((c) => c.id === dup.id)!.flags, "similarity"),
    ).toBe(true);
  });

  test("ignores an unknown rule id", () => {
    expect(recomputeRule(seed, "nope")).toBe(seed);
  });
});

describe("evaluateAll is consistent", () => {
  test("is idempotent", () => {
    const once = evaluateAll(seed);
    const twice = evaluateAll(once);
    for (const c of twice) {
      expect(ruleIds(c.flags)).toEqual(
        ruleIds(once.find((x) => x.id === c.id)!.flags),
      );
    }
  });

  test("every fixture flag is attributable to a real rule", () => {
    const known = new Set(INSPECTION_RULES.map((r) => r.id));
    for (const c of seed)
      for (const f of c.flags) expect(known.has(f.ruleId)).toBe(true);
  });

  test("no fixture references a claim outside the dataset", () => {
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

  test("every warned claim is in review", () => {
    for (const c of seed) {
      if (c.flags.some((f) => f.severity === "warn"))
        expect(c.status).toBe("Perlu ditinjau");
    }
  });
});

describe("threshold", () => {
  test("is the value the app filters on", () => {
    expect(REVIEW_THRESHOLD).toBe(60);
  });

  test("isPlausible rejects unknown diagnoses rather than defaulting open", () => {
    expect(isPlausible("ZZZ.9", "47.09")).toBe(false);
    expect(isPlausible("K35.8", "")).toBe(false);
  });
});
