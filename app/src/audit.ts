import { AuditLogSchema, type AuditEntry, type Claim } from '@preclaim/core'

const KEY = 'preclaim-audit-log'
const MAX_ENTRIES = 500

/**
 * Read the audit log, discarding anything that does not match the schema.
 *
 * `localStorage` is shared with every script on this origin and survives
 * forever, so its contents are untrusted input. A hand-edited or half-written
 * entry is dropped here instead of being handed to the UI as though it were a
 * real coder justification.
 */
export function readAudit(): AuditEntry[] {
  const parsed = AuditLogSchema.safeParse(readRaw())
  return parsed.success ? parsed.data : []
}

function readRaw(): unknown {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
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
