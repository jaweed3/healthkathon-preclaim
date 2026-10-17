export type ClaimStatus = 'Perlu ditinjau' | 'Siap submit' | 'Disetujui'

/** A single auditable change to a claim's procedure code. */
export type Revision = {
  at: string
  from: string
  to: string
  reason: string
  evidence: boolean
  previousScore: number
  newScore: number
}

export type Claim = {
  id: string
  patient: string
  service: string
  date: string
  amount: string
  status: ClaimStatus
  score: number
  diagnosis: string
  procedure: string
  length: string
  flags: string[]
  revisions?: Revision[]
}