import { z } from "zod";

/**
 * The canonical status vocabulary, and the runtime schema that enforces it.
 *
 * This module is the single source of truth: the app, the worker API, and any
 * future consumer all derive their values from here. Previously the worker
 * carried its own copy with English strings ('review'/'ready'/'approved'),
 * which silently drifted from the app's Indonesian vocabulary.
 */
/**
 * A string with actual content.
 *
 * `nonBlank` alone accepts `"   "`, which is not a code, not a claim
 * id, and emphatically not a coder's justification. Zod validates `.min()`
 * after `.trim()`, so this rejects whitespace-only input.
 */
const nonBlank = z.string().trim().min(1);

export const CLAIM_STATUS = {
  review: "Perlu ditinjau",
  ready: "Siap submit",
  approved: "Disetujui",
} as const;

export const ClaimStatusSchema = z.enum([
  CLAIM_STATUS.review,
  CLAIM_STATUS.ready,
  CLAIM_STATUS.approved,
]);

export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

/** A single auditable change to a claim's procedure code. */
export const RevisionSchema = z.object({
  at: z.iso.datetime(),
  from: nonBlank,
  to: nonBlank,
  reason: nonBlank,
  evidence: z.boolean(),
  previousScore: z.number().int().min(0).max(100),
  newScore: z.number().int().min(0).max(100),
});

export type Revision = z.infer<typeof RevisionSchema>;

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
  flags: z.array(nonBlank),
  revisions: z.array(RevisionSchema).optional(),
});

export type Claim = z.infer<typeof ClaimSchema>;

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
  revisions: z.array(RevisionSchema),
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
