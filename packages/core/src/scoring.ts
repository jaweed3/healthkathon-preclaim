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

export const REVIEW_THRESHOLD = 60;

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
