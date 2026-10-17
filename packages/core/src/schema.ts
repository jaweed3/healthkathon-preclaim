import { z } from "zod";

/**
 * A string with actual content.
 *
 * `z.string().min(1)` alone accepts `"   "`, which is not a code, not a claim
 * id, and emphatically not a coder's justification. Zod validates `.min()`
 * after `.trim()`, so this rejects whitespace-only input.
 */
export const nonBlank = z.string().trim().min(1);

/**
 * The canonical status vocabulary, and the runtime schema that enforces it.
 *
 * This module is the single source of truth: the app, the worker API, and any
 * future consumer all derive their values from here. Previously the worker
 * carried its own copy with English strings ('review'/'ready'/'approved'),
 * which silently drifted from the app's Indonesian vocabulary.
 */
export const CLAIM_STATUS = {
  review: "Perlu ditinjau",
  ready: "Siap submit",
  approved: "Disetujui",
  approvedWithNote: "Disetujui dengan catatan",
} as const;

export const ClaimStatusSchema = z.enum([
  CLAIM_STATUS.review,
  CLAIM_STATUS.ready,
  CLAIM_STATUS.approved,
  CLAIM_STATUS.approvedWithNote,
]);

export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

/**
 * A finding, attributed to the rule that produced it.
 *
 * `ruleId` is what makes recomputation safe: revising a claim must re-run only
 * the rule whose inputs changed. Previously flags were bare strings and a
 * revision overwrote the whole list, silently dropping unrelated findings such
 * as claim-to-claim similarity.
 */
export const FlagSchema = z.object({
  ruleId: nonBlank,
  message: nonBlank,
  severity: z.enum(["warn", "info"]),
});

export type Flag = z.infer<typeof FlagSchema>;

/** A change to a claim's procedure code, with the coder's justification. */
export const RevisionSchema = z.object({
  kind: z.literal("revision"),
  at: z.iso.datetime(),
  from: nonBlank,
  to: nonBlank,
  reason: nonBlank,
  evidence: z.boolean(),
  previousScore: z.number().int().min(0).max(100),
  newScore: z.number().int().min(0).max(100),
});

export type Revision = z.infer<typeof RevisionSchema>;

/**
 * A coder's decision to submit a claim despite active findings.
 *
 * The note is mandatory. Approving a flagged claim without recording why is
 * exactly the action an audit exists to prevent, so the schema makes it
 * impossible to persist an approval that cannot be explained later.
 */
export const ApprovalSchema = z.object({
  kind: z.literal("approval"),
  at: z.iso.datetime(),
  note: nonBlank,
  score: z.number().int().min(0).max(100),
  findingsAtApproval: z.array(FlagSchema),
});

export type Approval = z.infer<typeof ApprovalSchema>;

export const AuditEventSchema = z.discriminatedUnion("kind", [
  RevisionSchema,
  ApprovalSchema,
]);

export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const ClaimSchema = z.object({
  id: nonBlank,
  patient: nonBlank,
  service: nonBlank,
  date: nonBlank,
  amount: nonBlank,
  status: ClaimStatusSchema,
  score: z.number().int().min(0).max(100),
  diagnosis: nonBlank,
  procedure: nonBlank,
  length: nonBlank,
  flags: z.array(FlagSchema),
  /** Supporting documents recorded for this claim (resume, lab, imaging). */
  documents: z.array(nonBlank).optional(),
  history: z.array(AuditEventSchema).optional(),
});

export type Claim = z.infer<typeof ClaimSchema>;

/** Everything the app persists locally, validated as one unit. */
export const ClaimStoreSchema = z.object({ claims: z.array(ClaimSchema) });

/**
 * One row of the local audit log.
 *
 * This is the one genuinely untrusted shape in the app: it is read back out of
 * `localStorage`, which anything on this origin can write or corrupt. Parsing
 * it through a schema means a mangled entry is dropped instead of being handed
 * to the UI as if it were a real coder justification.
 */
export const AuditEntrySchema = z.object({
  claimId: nonBlank,
  patient: nonBlank,
  at: z.iso.datetime(),
  events: z.array(AuditEventSchema),
});

export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const AuditLogSchema = z.array(AuditEntrySchema);

/** The payload shape served by `GET /api/claims`. */
export const ClaimsResponseSchema = z.object({
  source: z.literal("synthetic-beta-data"),
  claims: z.array(
    z.object({
      id: nonBlank,
      score: z.number().int().min(0).max(100),
      status: ClaimStatusSchema,
    }),
  ),
});

export type ClaimsResponse = z.infer<typeof ClaimsResponseSchema>;

/** The payload served by `GET /health`. */
export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: nonBlank,
  environment: nonBlank,
});
