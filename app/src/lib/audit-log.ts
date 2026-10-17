import { AuditLogSchema, type AuditEntry, type Claim } from '@preclaim/core'
import { readJson, writeJson } from './storage'

const KEY = 'preclaim-audit-log'

/** Keep the log bounded; it is append-only and nothing prunes it. */
const MAX_ENTRIES = 500

const empty: AuditEntry[] = []

/**
 * The coder's revision history, persisted locally.
 *
 * The prototype is local-first: a justification has to survive a reload even
 * though nothing leaves the machine. Reads go through `AuditLogSchema`, so a
 * mangled entry is dropped rather than surfaced as a real justification.
 */
export function readAudit(): AuditEntry[] {
  return readJson(KEY, AuditLogSchema, empty)
}

export function auditFor(claimId: string): AuditEntry | undefined {
  return readAudit().find((e) => e.claimId === claimId)
}

/** Record a claim's revision history, replacing any prior entry for it. */
export function appendAudit(claim: Claim): void {
  if (!claim.revisions?.length) return

  const log = readAudit().filter((e) => e.claimId !== claim.id)
  log.push({
    claimId: claim.id,
    patient: claim.patient,
    at: new Date().toISOString(),
    revisions: claim.revisions,
  })

  // A failed write is not fatal: the revision still stands in memory, and
  // appending again on the next attempt re-establishes the trail.
  writeJson(KEY, log.slice(-MAX_ENTRIES))
}
