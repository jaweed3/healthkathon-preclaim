import type { Claim, Revision } from './types'

const KEY = 'preclaim-audit-log'
const MAX_ENTRIES = 500

export type AuditEntry = {
  claimId: string
  patient: string
  at: string
  revisions: Revision[]
}

export function readAudit(): AuditEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Append the claim's revision history to the local audit log.
 *
 * The prototype is local-first: the coder's justification has to survive a
 * reload even though nothing leaves the machine.
 */
export function appendAudit(claim: Claim): void {
  if (!claim.revisions?.length) return
  const log = readAudit().filter((e) => e.claimId !== claim.id)
  log.push({
    claimId: claim.id,
    patient: claim.patient,
    at: new Date().toISOString(),
    revisions: claim.revisions,
  })
  try {
    localStorage.setItem(KEY, JSON.stringify(log.slice(-MAX_ENTRIES)))
  } catch {
    // Storage full or blocked — the in-memory revision history still stands.
  }
}
