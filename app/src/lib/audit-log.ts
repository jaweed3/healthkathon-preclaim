import { AuditLogSchema, type AuditEntry, type AuditEvent, type Claim } from '@preclaim/core'
import { readJson, writeJson } from './storage'

const KEY = 'preclaim-audit-log'

/** Keep the log bounded; it is append-only and nothing prunes it. */
const MAX_ENTRIES = 500

const empty: AuditEntry[] = []

/**
 * The coder's decision history, persisted locally.
 *
 * The prototype is local-first: a justification has to survive a reload even
 * though nothing leaves the machine. Reads go through `AuditLogSchema`, so a
 * mangled entry is dropped rather than surfaced as a real justification.
 */
export function readAudit(): AuditEntry[] {
  return readJson(KEY, AuditLogSchema, empty)
}

/**
 * Record a decision against a claim.
 *
 * Both revisions and approvals go through here. An approval that does not
 * reach the log is the one thing an audit cannot tolerate: it would leave a
 * claim submitted with no record of who decided that or why.
 */
export function appendEvent(claim: Claim, event: AuditEvent): void {
  const log = readAudit()
  const existing = log.find((e) => e.claimId === claim.id)

  const entry: AuditEntry = {
    claimId: claim.id,
    patient: claim.patient,
    at: event.at,
    // The stored log — not claim.history — is the source of truth for what has
    // already happened. The in-memory claim carries no history of its own, so
    // appending to it silently kept only the most recent event.
    events: [...(existing?.events ?? []), event],
  }

  const next = [...log.filter((e) => e.claimId !== claim.id), entry]
  writeJson(KEY, next.slice(-MAX_ENTRIES))
}

export function historyFor(claimId: string): AuditEvent[] {
  return readAudit().find((e) => e.claimId === claimId)?.events ?? []
}

export function clearAudit(): void {
  writeJson(KEY, empty)
}
