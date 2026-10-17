/**
 * The canonical status vocabulary.
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
} as const;

export type ClaimStatus = (typeof CLAIM_STATUS)[keyof typeof CLAIM_STATUS];

/** A single auditable change to a claim's procedure code. */
export type Revision = {
  at: string;
  from: string;
  to: string;
  reason: string;
  evidence: boolean;
  previousScore: number;
  newScore: number;
};

export type Claim = {
  id: string;
  patient: string;
  service: string;
  date: string;
  amount: string;
  status: ClaimStatus;
  score: number;
  diagnosis: string;
  procedure: string;
  length: string;
  flags: string[];
  revisions?: Revision[];
};
