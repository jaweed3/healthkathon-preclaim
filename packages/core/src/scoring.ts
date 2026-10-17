import {
  CLAIM_STATUS,
  type Claim,
  type ClaimStatus,
  type Flag,
} from "./schema";

export { codeOf, daysOf, amountOf } from "./codes";

/**
 * How much each rule contributes to the risk score.
 *
 * A diagnosis/procedure mismatch outranks the rest: it is the finding most
 * likely to be a coding error rather than an artefact of the data. Weights live
 * with the policy, not here, because they are a policy decision.
 */
const RULE_WEIGHT: Record<string, number> = {
  "dx-procedure": 46,
  similarity: 34,
  "length-of-stay": 28,
  "icd10-ch18-primary": 30,
  "missing-evidence": 16,
};

/** A claim with no findings is not zero risk, just low. */
const BASELINE = 8;

/**
 * The risk score, derived from the findings.
 *
 * Deriving it here rather than storing an independent number is what keeps the
 * score and the findings from disagreeing.
 */
export function scoreFor(flags: Flag[]): number {
  const total = flags.reduce(
    (sum, f) => sum + (RULE_WEIGHT[f.ruleId] ?? 12),
    BASELINE,
  );
  return Math.min(100, total);
}

export const REVIEW_THRESHOLD = 60

/**
 * Readiness: how close a claim is to being submittable right now.
 *
 * Deliberately derived from the SAME finding list as the risk score, so the
 * two can never contradict each other. They answer different questions of the
 * same facts: risk is "how suspicious is this, and in what order should I
 * look", readiness is "can this leave the building now".
 *
 * A warning is a blocker and costs a lot. An informational finding is an
 * advisory and costs a little. That is the whole difference in behaviour --
 * two views of one list, not two opinions.
 */
export function readinessFor(flags: Flag[]): number {
  const blockers = flags.filter((f) => f.severity === 'warn').length
  const advisories = flags.filter((f) => f.severity === 'info').length
  return Math.max(0, 100 - blockers * 40 - advisories * 10);
}

/**
 * Status is driven by findings first, score second.
 *
 * Any warning holds the claim for a coder decision, regardless of how low the
 * score is. A claim with an active finding must never read as ready to send.
 */
export function statusFor(score: number, flags: Flag[] = []): ClaimStatus {
  if (flags.some((f) => f.severity === "warn")) return CLAIM_STATUS.review;
  return score >= REVIEW_THRESHOLD ? CLAIM_STATUS.review : CLAIM_STATUS.ready;
}

export const scoreTone = (n: number) =>
  n >= REVIEW_THRESHOLD ? "high" : n >= 30 ? "medium" : "low";

export const averageScore = (claims: Claim[]): number =>
  claims.length === 0
    ? 0
    : Math.round(claims.reduce((a, c) => a + c.score, 0) / claims.length);
