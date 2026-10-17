import { amountOf, codeOf, daysOf } from "../codes";
import type { Claim, Flag } from "../schema";
import type { Rule } from "./schema";

export type RuleContext = { claim: Claim; claims: Claim[] };

/**
 * One evaluator per declared rule type.
 *
 * This is the fixed behaviour set. A rule file chooses among these and supplies
 * parameters; it cannot introduce new behaviour. Keeping the surface this
 * small is what stops "policy-as-code" from quietly becoming a language nobody
 * can review.
 */
type Evaluator = (rule: Rule, ctx: RuleContext) => Flag[];

/**
 * Fraction of the compared fields two claims agree on.
 *
 * The switch is exhaustive over the field names the policy schema allows, and
 * the default throws rather than falling through: a missing case here returns
 * `undefined`, which is falsy and silently lowers the score. That is exactly
 * how a comparison field can be configured in the rule file and then quietly
 * stop contributing.
 */
function similarity(a: Claim, b: Claim, fields: string[]): number {
  const same = fields.filter((f) => {
    switch (f) {
      case "diagnosis":
        return codeOf(a.diagnosis) === codeOf(b.diagnosis);
      case "procedure":
        return codeOf(a.procedure) === codeOf(b.procedure);
      case "length":
        return daysOf(a.length) === daysOf(b.length);
      case "amount":
        return amountOf(a.amount) === amountOf(b.amount);
      default:
        throw new Error(`similarity: unsupported field ${String(f)}`);
    }
  }).length;
  return same / fields.length;
}

export const RULE_EVALUATORS = {
  dx_procedure: (rule, { claim }) => {
    if (rule.type !== "dx_procedure") return [];
    const dx = codeOf(claim.diagnosis);
    const allowed = rule.params.pairs[dx];

    // No table for this diagnosis means we have no opinion, not that the pair
    // is wrong. Saying so out loud is the honest outcome; silently passing a
    // real ICD-10 code we have never seen would read as "checked and fine".
    if (allowed === undefined) {
      return [
        {
          ruleId: rule.id,
          message: `Diagnosis ${dx} belum dikenal aturan; kesesuaian tindakan tidak dapat diperiksa`,
          severity: "info",
        },
      ];
    }

    return allowed.includes(codeOf(claim.procedure))
      ? []
      : [
          {
            ruleId: rule.id,
            message: rule.params.message,
            severity: rule.severity,
          },
        ];
  },

  los_threshold: (rule, { claim }) => {
    if (rule.type !== "los_threshold") return [];
    const typical = rule.params.typical[codeOf(claim.diagnosis)];
    // An unknown diagnosis yields no verdict. Guessing "too long" for a code
    // we have never seen would manufacture a finding out of missing data.
    if (typical === undefined) return [];

    return daysOf(claim.length) > typical
      ? [
          {
            ruleId: rule.id,
            message: `Durasi rawat di atas pola umum (${claim.length}, biasanya ${typical} hari)`,
            severity: rule.severity,
          },
        ]
      : [];
  },

  required_evidence: (rule, { claim }) => {
    if (rule.type !== "required_evidence") return [];
    const needsEvidence = rule.params.procedures.includes(
      codeOf(claim.procedure),
    );
    const documented = (claim.documents?.length ?? 0) > 0;

    return needsEvidence && !documented
      ? [
          {
            ruleId: rule.id,
            message: rule.params.message,
            severity: rule.severity,
          },
        ]
      : [];
  },

  similarity: (rule, { claim, claims }) => {
    if (rule.type !== "similarity") return [];

    const near = claims
      .filter((c) => c.id !== claim.id)
      .map((c) => ({
        id: c.id,
        score: similarity(claim, c, rule.params.fields),
      }))
      .filter((c) => c.score >= rule.params.threshold)
      .sort((a, b) => b.score - a.score);

    return near.slice(0, 1).map((n) => ({
      ruleId: rule.id,
      message: `Kemiripan ${Math.round(n.score * 100)}% dengan klaim ${n.id}`,
      severity: rule.severity,
    }));
  },

  /**
   * ICD-10-CM guideline I.C.18.a–b.
   *
   * The naive form of this rule — "chapter R codes are never a principal
   * diagnosis" — is a documented myth: AAPC and CMS both state symptom codes
   * ARE acceptable as principal when no definitive diagnosis has been
   * established. So this fires only when a definitive diagnosis is also
   * recorded, which is the case the guideline actually addresses.
   */
  icd10_primary_diagnosis: (rule, { claim }) => {
    if (rule.type !== "icd10_primary_diagnosis") return [];

    const primary = codeOf(claim.diagnosis).toUpperCase();
    const isSymptom = rule.params.chapters.some((ch) =>
      primary.startsWith(ch.toUpperCase()),
    );
    const definitiveRecorded = (claim.establishedDiagnoses?.length ?? 0) > 0;

    return isSymptom && definitiveRecorded
      ? [
          {
            ruleId: rule.id,
            message: rule.params.message,
            severity: rule.severity,
          },
        ]
      : [];
  },
} satisfies Record<Rule["type"], Evaluator>;
