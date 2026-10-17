import type { Claim } from './types'

/**
 * Which procedure codes are plausible for a diagnosis.
 *
 * This is the prototype's whole rule set: explicit, inspectable, and
 * deterministic. No model, no inference — the UI promises explainable
 * findings, so the explanation has to be readable by a coder.
 */
const PLAUSIBLE: Record<string, string[]> = {
  'K35.8': ['47.09', '47.11', '47.12'], // appendicitis → appendectomy
  'I10': ['93.96'], // essential hypertension → respiratory therapy
  'A09': ['99.04'], // gastroenteritis → transfusion
  'J18.9': ['93.90', '93.91'], // pneumonia → mechanical ventilation
}

/** Score for a diagnosis/procedure pair, derived from the entered code. */
export function scoreClaim(claim: Claim, code: string): number {
  const rank = (PLAUSIBLE[diagnosisCode(claim.diagnosis)] ?? []).indexOf(code)
  if (rank === -1) return 82
  return [18, 26, 34][rank] ?? 40
}

export function flagsFor(claim: Claim, code: string): string[] {
  const allowed = PLAUSIBLE[diagnosisCode(claim.diagnosis)] ?? []
  return allowed.includes(code) ? [] : ['Kode tindakan tidak sesuai dengan diagnosis']
}

export function statusFor(score: number): 'Perlu ditinjau' | 'Siap submit' {
  return score >= 60 ? 'Perlu ditinjau' : 'Siap submit'
}

/** `47.09 — Apendektomi lainnya` → `47.09` */
export const codeOf = (label: string): string => label.split(' — ')[0].trim()

const diagnosisCode = (d: string) => codeOf(d)

export const scoreTone = (n: number) => (n >= 60 ? 'high' : n >= 30 ? 'medium' : 'low')

export const averageScore = (claims: Claim[]): number =>
  claims.length === 0 ? 0 : Math.round(claims.reduce((a, c) => a + c.score, 0) / claims.length)