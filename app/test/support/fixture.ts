/**
 * What the synthetic fixture is expected to look like.
 *
 * Assertions reference these instead of hardcoding numbers and ids, so a
 * fixture change surfaces as one edit here rather than a dozen scattered
 * failures. The values are pinned deliberately: they are the claims a judge
 * sees on first load, so a silent change to them is a change to the demo.
 */

export const IDS = {
  /** K35.8 + 99.04 — a procedure from the wrong diagnosis. */
  dxMismatch: 'CLM-260918-021',
  /** A09 + 99.04, 4 days — duplicated with `duplicate`. */
  duplicateA: 'CLM-260918-020',
  /** Near-identical to `duplicateA`; carries the similarity finding. */
  duplicateB: 'CLM-260918-019',
  /** J18.9 + 93.90, 9 days — over the typical stay. */
  longStay: 'CLM-260918-018',
  /** Clean claim, no findings. */
  clean: 'CLM-260918-017',
} as const

export const ID_PREFIX = 'CLM-260918'

export const COUNTS = {
  total: 5,
  review: 4,
  ready: 1,
  /** score >= 60: dxMismatch (70), duplicateA (70), duplicateB (86) */
  risky: 3,
} as const

export const SCORES = {
  dxMismatch: 70,
  duplicateA: 70,
  duplicateB: 86,
  longStay: 52,
  clean: 8,
  /** mean of the above, rounded */
  average: 57,
} as const

export const FINDING = {
  dxMismatch: 'Kode tindakan tidak sesuai dengan diagnosis',
  missingEvidence: 'Tindakan invasif tanpa dokumen pendukung tercatat',
  longStay: /Durasi rawat di atas pola umum/,
  similarity: /Kemiripan \d+% dengan klaim/,
} as const

/** Claims the fixture marks as in review, in list order. */
export const REVIEW_IDS = [IDS.dxMismatch, IDS.duplicateA, IDS.duplicateB, IDS.longStay]

/** Claims scoring at or above the review threshold. */
export const RISKY_IDS = [IDS.dxMismatch, IDS.duplicateA, IDS.duplicateB]

export const RULES = [
  'dx-procedure',
  'length-of-stay',
  'missing-evidence',
  'similarity',
  'icd10-ch18-primary',
] as const

export const NOTICE = {
  needsReview: 'Kode diperbarui. Kombinasi diagnosis–tindakan masih perlu ditinjau.',
  missingJustification: 'Lengkapi kode koreksi, alasan, dan evidence sebelum mengonfirmasi revisi.',
  approvalNeedsNote: 'Tulis alasan persetujuan sebelum melanjutkan.',
  reset: 'Data demo dipulihkan ke kondisi awal.',
} as const
