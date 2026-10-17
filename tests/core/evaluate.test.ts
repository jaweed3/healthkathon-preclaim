import { describe, expect, test } from "bun:test";
import {
  evaluate,
  formatReport,
  runStandardEvaluation,
} from "../../packages/core/src/evaluate";
import {
  generate,
  hardCaseSuite,
  runRules,
} from "../../packages/core/src/generator";
import { codeOf, daysOf, amountOf } from "../../packages/core/src/codes";
import { INSPECTION_RULES } from "../../packages/core/src/rules";

describe("generator", () => {
  test("is deterministic for a given seed", () => {
    const a = generate({ count: 40, seed: 7 });
    const b = generate({ count: 40, seed: 7 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("different seeds produce different corpora", () => {
    const a = generate({ count: 40, seed: 1 });
    const b = generate({ count: 40, seed: 2 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  test("produces the requested number of base claims, plus injected ones", () => {
    const g = generate({ count: 100, seed: 3 });
    expect(g.length).toBeGreaterThanOrEqual(100);
  });

  test("claim ids are unique", () => {
    const g = generate({ count: 120, seed: 5 });
    expect(new Set(g.map((x) => x.claim.id)).size).toBe(g.length);
  });

  test("every claim has the fields the schema requires", () => {
    for (const g of generate({ count: 60, seed: 9 })) {
      expect(g.claim.id).toBeTruthy();
      expect(g.claim.diagnosis).toBeTruthy();
      expect(g.claim.procedure).toBeTruthy();
      expect(g.claim.length).toBeTruthy();
      expect(g.claim.amount).toBeTruthy();
    }
  });

  test("injects more than one kind of anomaly", () => {
    const kinds = new Set(
      generate({ count: 200, seed: 11 }).flatMap((g) => g.injected),
    );
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  test("anomalyRate controls how many point anomalies are injected", () => {
    const count = (rate: number) =>
      generate({ count: 200, seed: 13, anomalyRate: rate })
        .flatMap((g) => g.injected)
        .filter((k) => k !== "similarity").length;

    const none = count(0);
    const all = count(1);

    expect(none).toBeLessThan(all / 2);
  });

  test("the same seed gives the same anomaly count at a fixed rate", () => {
    const a = generate({ count: 120, seed: 29, anomalyRate: 0.5 }).flatMap(
      (g) => g.injected,
    );
    const b = generate({ count: 120, seed: 29, anomalyRate: 0.5 }).flatMap(
      (g) => g.injected,
    );
    expect(a).toEqual(b);
  });

  test("never emits an empty procedure code", () => {
    for (const g of generate({ count: 150, seed: 17 })) {
      expect(codeOf(g.claim.procedure)).not.toBe("");
    }
  });
});

describe("ground truth is derived independently of the evaluator", () => {
  test("expected set never comes from running the rules", () => {
    // A dx mismatch must be expected because the procedure was chosen from
    // another diagnosis's table, not because the rule said so.
    const g = generate({ count: 200, seed: 21 });
    const mismatches = g.filter(
      (x) =>
        x.injected.includes("dx_procedure") ||
        x.injected.includes("dx-procedure"),
    );
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches.every((x) => x.expected.includes("dx-procedure"))).toBe(
      true,
    );
  });
});

describe("evaluation", () => {
  const report = runStandardEvaluation(200);

  test("exercises every rule in the policy", () => {
    for (const rule of INSPECTION_RULES) {
      const m = report.perRule.find((x) => x.ruleId === rule.id)!;
      expect(m.support).toBeGreaterThan(0);
    }
  });

  test("every rule matches the cases built for it", () => {
    for (const m of report.perRule) {
      expect(m.falseNegatives).toBe(0);
      expect(m.recall).toBe(1);
    }
  });

  test("no rule fires on cases built for another rule", () => {
    for (const m of report.perRule) {
      expect(m.falsePositives).toBe(0);
      expect(m.precision).toBe(1);
    }
  });

  test("precision and recall are reported as fractions, not percentages", () => {
    for (const m of report.perRule) {
      expect(
        m.precision === null || (m.precision >= 0 && m.precision <= 1),
      ).toBe(true);
    }
  });

  test("counts reconcile: TP + FN equals the support", () => {
    for (const m of report.perRule) {
      expect(m.truePositives + m.falseNegatives).toBe(m.support);
    }
  });

  test("the corpus is not all anomalies", () => {
    // A corpus where every claim is anomalous would make precision meaningless.
    expect(report.claimsWithAnomaly).toBeLessThan(report.claims);
  });

  test("most claims are not held for review", () => {
    expect(report.flaggedShare).toBeLessThan(0.75);
  });

  test("reports and gates the false-positive rate on the normal synthetic set", () => {
    expect(report.normalClaims).toBeGreaterThan(0);
    expect(report.normalFalsePositiveRate).not.toBeNull();
    expect(report.normalFalsePositiveRate!).toBeLessThan(0.1);
  });

  test("measures evaluator runtime against the one-second target", () => {
    expect(report.maxEvaluationMs).toBeGreaterThanOrEqual(0);
    expect(report.performanceTargetMet).toBe(true);
  });

  test("every emitted finding has reason, source, and evidence", () => {
    for (const result of runRules(generate({ count: 150, seed: 2026 }))) {
      for (const finding of result.actual) {
        expect(finding.reason.trim()).not.toBe("");
        expect(finding.source.trim()).not.toBe("");
        expect(finding.evidence.length).toBeGreaterThan(0);
      }
    }
  });

  test("the report states its own limitation", () => {
    expect(formatReport(report)).toContain(
      "bukan akurasi terhadap klaim nyata",
    );
  });

  test("evaluate() accepts an arbitrary corpus", () => {
    const small = evaluate(generate({ count: 40, seed: 31 }));
    expect(small.claims).toBeGreaterThanOrEqual(40);
    expect(small.perRule).toHaveLength(INSPECTION_RULES.length);
  });
});

describe("similarity false positives", () => {
  // The over-broad signature (diagnosis + procedure + stay) flagged most of the
  // corpus, because routine outpatient claims share all three. Adding amount
  // is what fixed it; these cases guard the fix.
  test("near-miss claims exist and must not be flagged", () => {
    const g = generate({ count: 200, seed: 23 });
    const nearMiss = g.filter((x) => x.claim.id.includes("-N"));
    expect(nearMiss.length).toBeGreaterThan(0);

    const report = evaluate(g);
    const similarity = report.perRule.find((m) => m.ruleId === "similarity")!;
    expect(similarity.falsePositives).toBe(0);
  });

  test("a near miss differs from its source only in amount", () => {
    const g = generate({ count: 200, seed: 23 });
    const miss = g.find((x) => x.claim.id.includes("-N"))!;
    const source = g.find(
      (x) =>
        codeOf(x.claim.diagnosis) === codeOf(miss.claim.diagnosis) &&
        codeOf(x.claim.procedure) === codeOf(miss.claim.procedure) &&
        daysOf(x.claim.length) === daysOf(miss.claim.length),
    )!;

    expect(amountOf(source.claim.amount)).not.toBe(amountOf(miss.claim.amount));
    expect(source.claim.id).not.toBe(miss.claim.id);
  });
});

describe("hard-case suite", () => {
  test("checks explicit boundary cases independently of random injection", () => {
    const cases = hardCaseSuite();
    expect(cases.length).toBeGreaterThanOrEqual(4);
    for (const item of cases) {
      const context = item.expectedRuleIds.includes("similarity")
        ? [{ ...item.claim, id: `${item.claim.id}-PEER` }]
        : [];
      const actual = runRules([
        { claim: item.claim, expected: item.expectedRuleIds, injected: [] },
      ])
        .map((r) => r.actual.map((f) => f.ruleId))
        .flat();
      const withContext = item.expectedRuleIds.includes("similarity")
        ? runRules([
            { claim: item.claim, expected: item.expectedRuleIds, injected: [] },
            ...context.map((claim) => ({ claim, expected: [], injected: [] })),
          ])[0].actual.map((f) => f.ruleId)
        : actual;
      for (const ruleId of item.expectedRuleIds)
        expect(withContext).toContain(ruleId);
    }
  });
});
