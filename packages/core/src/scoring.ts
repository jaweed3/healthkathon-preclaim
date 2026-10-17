import { CLAIM_STATUS, type Claim } from "./types";

/**
 * Which procedure codes are plausible for a diagnosis.
 *
 * This is the prototype's whole rule set: explicit, inspectable, and
 * deterministic. No model, no inference — the UI promises explainable
 * findings, so the explanation has to be readable by a coder.
 */
const PLAUSIBLE: Record<string, string[]> = {
  "K35.8": ["47.09", "47.11", "47.12"], // appendicitis → appendectomy
  I10: ["93.96"], // essential hypertension → respiratory therapy
  A09: ["99.04"], // gastroenteritis → transfusion
  "J18.9": ["93.90", "93.91"], // pneumonia → mechanical ventilation
};

/** `47.09 — Apendektomi lainnya` → `47.09` */
export const codeOf = (label: string): string => label.split(" — ")[0].trim();

/** Score for a diagnosis/procedure pair, derived from the entered code. */
export function scoreClaim(claim: Claim, code: string): number {
  const rank = (PLAUSIBLE[codeOf(claim.diagnosis)] ?? []).indexOf(code);
  if (rank === -1) return 82;
  return [18, 26, 34][rank] ?? 40;
}

export function flagsFor(claim: Claim, code: string): string[] {
  const allowed = PLAUSIBLE[codeOf(claim.diagnosis)] ?? [];
  return allowed.includes(code)
    ? []
    : ["Kode tindakan tidak sesuai dengan diagnosis"];
}

/**
 * A claim stays in review at or above this score.
 *
 * This is the gate that stops the revision flow from being a rubber stamp:
 * an implausible code scores 82 and therefore never clears.
 */
export const REVIEW_THRESHOLD = 60;

export function statusFor(score: number): "Perlu ditinjau" | "Siap submit" {
  return score >= REVIEW_THRESHOLD ? CLAIM_STATUS.review : CLAIM_STATUS.ready;
}

export const scoreTone = (n: number) =>
  n >= REVIEW_THRESHOLD ? "high" : n >= 30 ? "medium" : "low";

export const averageScore = (claims: Claim[]): number =>
  claims.length === 0
    ? 0
    : Math.round(claims.reduce((a, c) => a + c.score, 0) / claims.length);
