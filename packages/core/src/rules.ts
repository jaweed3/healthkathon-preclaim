import { codeOf } from "./codes";
import { CLAIM_STATUS, type Claim, type Flag } from "./schema";
import { RULE_EVALUATORS } from "./rules/engine";
import { POLICY } from "./rules/policy";
import { readinessFor, scoreFor, statusFor } from "./scoring";

export { POLICY };
export type { Rule, RuleSet, EvaluatorType, RuleBasis } from "./rules/schema";
export { EVALUATOR_TYPES, RuleBasisSchema } from "./rules/schema";
export { ruleById, ruleByType } from "./rules/policy";
export type { RuleContext } from "./rules/engine";

/** The rules this engine knows how to run, in file order. */
export const INSPECTION_RULES = POLICY.rules;

function cohortForRule(
  rule: Extract<(typeof POLICY.rules)[number], { type: "local_anomaly" }>,
  claim: Claim,
  claims: Claim[],
): Claim[] {
  return claims.filter(
    (candidate) =>
      candidate.id !== claim.id &&
      rule.params.cohortFields.every((field) =>
        field === "service"
          ? candidate.service === claim.service
          : codeOf(candidate.diagnosis) === codeOf(claim.diagnosis),
      ),
  );
}

function evidenceForRule(
  rule: (typeof POLICY.rules)[number],
  claim: Claim,
  claims: Claim[],
): string[] {
  if (rule.type === "similarity") {
    const matches = claims
      .filter((candidate) => candidate.id !== claim.id)
      .filter((candidate) =>
        rule.params.fields.every((field) => {
          if (field === "diagnosis")
            return codeOf(candidate.diagnosis) === codeOf(claim.diagnosis);
          if (field === "procedure")
            return codeOf(candidate.procedure) === codeOf(claim.procedure);
          if (field === "length") return candidate.length === claim.length;
          return candidate.amount === claim.amount;
        }),
      )
      .map((candidate) => candidate.id);
    return [claim.id, ...matches];
  }

  if (rule.type === "local_anomaly") {
    const cohortSize = cohortForRule(rule, claim, claims).length;
    return [
      `Cohort lokal: ${cohortSize} klaim pembanding`,
      `Lama rawat klaim: ${claim.length}`,
      `Nilai klaim: ${claim.amount}`,
    ];
  }

  return [
    `Diagnosis: ${claim.diagnosis}`,
    `Tindakan: ${claim.procedure}`,
    `Lama rawat: ${claim.length}`,
    `Dokumen tercatat: ${(claim.documents ?? []).join(", ") || "tidak ada"}`,
  ];
}

/** Run every rule and return the flags it produces. */
export function evaluateRules({
  claim,
  claims,
}: {
  claim: Claim;
  claims: Claim[];
}): Flag[] {
  return POLICY.rules.flatMap((rule) =>
    RULE_EVALUATORS[rule.type](rule, { claim, claims }).map((flag) => {
      const evidence = evidenceForRule(rule, claim, claims);
      const deviationScore =
        "deviationScore" in flag ? flag.deviationScore : undefined;
      const reason =
        rule.type === "local_anomaly" && typeof deviationScore === "number"
          ? `${rule.description} Penyimpangan: ${deviationScore.toFixed(1)} simpangan baku.`
          : rule.description;
      return { ...flag, reason, source: rule.source, evidence };
    }),
  );
}

/**
 * Replace only the flags owned by `ruleId`, leaving every other rule's flags
 * intact.
 *
 * Fresh flags attributed to a different rule are dropped rather than merged:
 * this function exists to refresh one rule's contribution, so letting it
 * introduce another rule's flags would quietly corrupt ownership.
 */
export function replaceFlagsForRule(
  existing: Flag[],
  ruleId: string,
  fresh: Flag[],
): Flag[] {
  return [
    ...existing.filter((f) => f.ruleId !== ruleId),
    ...fresh.filter((f) => f.ruleId === ruleId),
  ];
}

/**
 * Re-run one rule across the whole claim set.
 *
 * Flags, score and status are refreshed together. Refreshing flags alone would
 * leave a claim showing "Aman" while a warning sits on screen — the score has
 * to be a function of the findings, never a parallel number.
 */
export function recomputeRule(claims: Claim[], ruleId: string): Claim[] {
  const rule = POLICY.rules.find((r) => r.id === ruleId);
  if (!rule) return claims;

  const next = claims.map((claim) => {
    const fresh = evaluateRules({ claim, claims }).filter(
      (flag) => flag.ruleId === ruleId,
    );
    return { ...claim, flags: replaceFlagsForRule(claim.flags, ruleId, fresh) };
  });

  return next.map(settle);
}

/**
 * Bring a claim's derived fields in line with its flags.
 *
 * A claim the coder has already decided is left alone. Re-deriving status from
 * findings on load would silently undo an approval — the findings do not change
 * just because the page was reloaded, so neither should the decision.
 */
function settle(claim: Claim): Claim {
  const decided =
    claim.status === CLAIM_STATUS.approved ||
    claim.status === CLAIM_STATUS.approvedWithNote;
  const score = scoreFor(claim.flags);
  return {
    ...claim,
    score,
    readiness: readinessFor(claim.flags),
    status: decided ? claim.status : statusFor(score, claim.flags),
  };
}

/** Re-run every rule from scratch and refresh score and status. */
export function evaluateAll(claims: Claim[]): Claim[] {
  return claims.map((claim) =>
    settle({ ...claim, flags: evaluateRules({ claim, claims }) }),
  );
}

/** Build a claim's starting flags from a full evaluation. */
export const initialFlags = (claim: Claim, claims: Claim[]): Flag[] =>
  evaluateRules({ claim, claims });

/** The plausibility table, as it currently sits in the loaded policy. */
function dxProcedurePairs(): Record<string, string[]> {
  const rule = POLICY.rules.find((r) => r.type === "dx_procedure");
  return rule && rule.type === "dx_procedure" ? rule.params.pairs : {};
}

/** Procedure codes the loaded policy accepts for a diagnosis, if any. */
export function allowedCodes(diagnosisCode: string): string[] {
  return dxProcedurePairs()[codeOf(diagnosisCode)] ?? [];
}

/** Whether a diagnosis/procedure pair passes the loaded plausibility rule. */
export const isPlausible = (diagnosisCode: string, code: string): boolean =>
  allowedCodes(diagnosisCode).includes(code);

/** Diagnosis codes the policy has a plausibility table for. */
export const knownDiagnoses = (): string[] => Object.keys(dxProcedurePairs());
