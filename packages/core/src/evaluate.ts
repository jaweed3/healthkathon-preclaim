import { INSPECTION_RULES } from "./rules";
import { generate, runRules, type Generated } from "./generator";

/**
 * Per-rule precision and recall against a generated dataset.
 *
 * WHAT THESE NUMBERS MEAN: they answer "does each rule still fire exactly when
 * the generator built a case for it". They are a regression guard — a rule that
 * silently stops matching, or starts matching everything, moves these numbers.
 *
 * WHAT THEY DO NOT MEAN: they are not an accuracy claim. The anomalies are
 * injected by us and the cases are ours, so a perfect score here measures that
 * the generator and the detector still agree, not that the detector finds
 * fraud in real claims. Real accuracy needs real claims, reviewed by a coder,
 * which is outside this prototype. See the proposal's limitation note.
 */

export type RuleMetrics = {
  ruleId: string;
  title: string;
  /** Cases the generator built for this rule. */
  support: number;
  /** Generator built one and the rule fired. */
  truePositives: number;
  /** Rule fired on a claim the generator did not build it for. */
  falsePositives: number;
  /** Generator built one and the rule stayed silent. */
  falseNegatives: number;
  precision: number | null;
  recall: number | null;
  falsePositiveRate: number | null;
};

export type Report = {
  claims: number;
  claimsWithAnomaly: number;
  /** Share of claims carrying at least one finding. */
  flaggedShare: number;
  normalClaims: number;
  normalFalsePositives: number;
  normalFalsePositiveRate: number | null;
  normalFalsePositiveRateByRule: { ruleId: string; rate: number | null; falsePositives: number; normalClaims: number }[];
  maxEvaluationMs: number;
  performanceTargetMet: boolean;
  perRule: RuleMetrics[];
};

const ratio = (n: number, d: number) => (d === 0 ? null : n / d);

export function evaluate(generated: Generated[]): Report {
  const startedAt = performance.now();
  const results = runRules(generated);
  const evaluationMs = performance.now() - startedAt;
  const normal = results.filter((r) => r.expected.length === 0);
  const normalFalsePositives = normal.filter((r) => r.actual.some((f) => f.severity === "warn")).length;
  const normalFalsePositiveRateByRule = INSPECTION_RULES.map((rule) => {
    const falsePositives = normal.filter((r) => r.actual.some((f) => f.ruleId === rule.id)).length;
    return { ruleId: rule.id, rate: ratio(falsePositives, normal.length), falsePositives, normalClaims: normal.length };
  });

  const perRule: RuleMetrics[] = INSPECTION_RULES.map((rule) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;

    for (const r of results) {
      const expected = r.expected.includes(rule.id);
      const fired = r.actual.some((f) => f.ruleId === rule.id);

      if (expected && fired) tp++;
      else if (!expected && fired) fp++;
      else if (expected && !fired) fn++;
    }

    return {
      ruleId: rule.id,
      title: rule.title,
      support: tp + fn,
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      precision: ratio(tp, tp + fp),
      recall: ratio(tp, tp + fn),
      falsePositiveRate: ratio(fp, results.length - (tp + fn)),
    };
  });

  return {
    claims: generated.length,
    claimsWithAnomaly: generated.filter((g) => g.expected.length > 0).length,
    flaggedShare:
      results.filter((r) => r.actual.some((f) => f.severity === "warn"))
        .length / results.length,
    normalClaims: normal.length,
    normalFalsePositives,
    normalFalsePositiveRate: ratio(normalFalsePositives, normal.length),
    normalFalsePositiveRateByRule,
    maxEvaluationMs: evaluationMs,
    performanceTargetMet: evaluationMs <= 1000,
    perRule,
  };
}

const pct = (n: number | null) =>
  n === null ? "   n/a" : `${(n * 100).toFixed(1).padStart(5)}%`;

export function formatReport(report: Report): string {
  const rows = report.perRule.map((m) =>
    [
      m.ruleId.padEnd(22),
      String(m.support).padStart(5),
      String(m.truePositives).padStart(5),
      String(m.falsePositives).padStart(5),
      String(m.falseNegatives).padStart(5),
      pct(m.precision),
      pct(m.recall),
    ].join("  "),
  );

  return [
    `claims              ${report.claims}`,
    `dengan anomali      ${report.claimsWithAnomaly}`,
    `dengan peringatan   ${(report.flaggedShare * 100).toFixed(1)}%`,
    `normal synthetic    ${report.normalClaims}`,
    `FPR normal           ${pct(report.normalFalsePositiveRate)}`,
    ...report.normalFalsePositiveRateByRule.map((m) => `  ${m.ruleId.padEnd(20)} ${pct(m.rate)} (${m.falsePositives}/${m.normalClaims})`),
    `waktu evaluator     ${report.maxEvaluationMs.toFixed(2)} ms (target <= 1000 ms: ${report.performanceTargetMet ? "PASS" : "FAIL"})`,
    "",
    "rule                  n     TP    FP    FN   prec   rec",
    ...rows,
    "",
    "n = kasus yang dibangun generator untuk aturan ini.",
    "Angka ini mengukur bahwa detektor masih cocok dengan kasus yang kami bangun,",
    "bukan akurasi terhadap klaim nyata. Lihat catatan keterbatasan di proposal.",
  ].join("\n");
}

/** Convenience: generate a standard corpus and measure it. */
export function runStandardEvaluation(count = 200, seed = 20261017): Report {
  return evaluate(generate({ count, seed }));
}
