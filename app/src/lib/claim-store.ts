import { ClaimStoreSchema, evaluateAll, type Claim } from '@preclaim/core'
import { readJson, writeJson } from './storage'

const KEY = 'preclaim-claims'

/**
 * Load the claim set, falling back to the fixture.
 *
 * Local-first means the coder's work has to survive a reload. Previously every
 * claim lived in React state only, so adding a claim or approving one was lost
 * on refresh — which made the "data tersimpan lokal" claim in the header false.
 *
 * Anything off-contract is discarded in favour of the fixture rather than
 * half-loaded: a corrupt store is not something to try to repair in the UI.
 */
export function loadClaims(fallback: Claim[]): Claim[] {
  const stored = readJson(KEY, ClaimStoreSchema, null)
  if (!stored || stored.claims.length === 0) return fallback

  // Re-derive score/status from the persisted flags rather than trusting the
  // stored values, so an older or hand-edited store cannot present a claim as
  // clean when its findings say otherwise.
  return evaluateAll(stored.claims.map((claim) => ({
    ...claim,
    readiness: claim.readiness ?? 0,
  })))
}

export function saveClaims(claims: Claim[]): boolean {
  return writeJson(KEY, { claims })
}

export function clearClaims(): void {
  writeJson(KEY, { claims: [] })
}
