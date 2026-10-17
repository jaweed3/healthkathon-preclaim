import {
  CLAIM_STATUS,
  type Claim,
  type ClaimStatus,
  type Flag,
} from "./schema";

/**
 * Which procedure codes are plausible for a diagnosis.
 *
 * A deliberately small, inspectable table. The UI promises explainable
 * findings, so the explanation has to be readable by a coder rather than
 * inferred by a model.
 */
export const PLAUSIBLE: Record<string, string[]> = {
  "K35.8": ["47.09", "47.11", "47.12"], // appendicitis → appendectomy
  I10: ["93.96"], // essential hypertension → respiratory therapy
  A09: ["99.04"], // gastroenteritis → transfusion
  "J18.9": ["93.90", "93.91"], // pneumonia → mechanical ventilation
};

/** `47.09 — Apendektomi lainnya` → `47.09` */
export const codeOf = (label: string): string => label.split(" — ")[0].trim();

/** Every diagnosis the rule set knows about, for pickers and the rules view. */
export const knownDiagnoses = (): string[] => Object.keys(PLAUSIBLE);

/** The procedure codes accepted for a diagnosis code, if it is known. */
export const allowedCodes = (diagnosisCode: string): string[] =>
  PLAUSIBLE[diagnosisCode] ?? [];

/** Whether a diagnosis/procedure pair passes the plausibility rule. */
export function isPlausible(diagnosisCode: string, code: string): boolean {
  return allowedCodes(diagnosisCode).includes(code);
}

/**
 * How much each rule contributes to the risk score.
 *
 * A diagnosis/procedure mismatch outranks the rest: it is the finding most
 * likely to be a coding error rather than an artefact of the data.
 */
const RULE_WEIGHT: Record<string, number> = {
  "dx-procedure": 46,
  similarity: 34,
  "length-of-stay": 28,
  "missing-evidence": 16,
};

/** A claim with no findings is not zero risk, just low. */
const BASELINE = 8;

/**
 * The risk score, derived from the findings.
 *
 * Deriving it here rather than storing an independent number is what keeps the
 * score and the findings from disagreeing — previously the score came from
 * procedure plausibility alone, so a claim carrying a similarity warning could
 * still present as 18/100 "Aman" with a warning on screen.
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
