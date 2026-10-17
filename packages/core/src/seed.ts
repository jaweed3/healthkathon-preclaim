import { CLAIM_STATUS, ClaimSchema, type Claim } from "./schema";

/** Synthetic data only — no real patient information. */
const SEED: Claim[] = [
  {
    id: "CLM-240918-021",
    patient: "Pasien A-104",
    service: "Rawat inap • Bedah",
    date: "18 Sep 2026",
    amount: "Rp 18.450.000",
    status: CLAIM_STATUS.review,
    score: 78,
    diagnosis: "K35.8 — Apendisitis akut",
    procedure: "47.09 — Apendektomi lainnya",
    length: "4 hari",
    flags: [
      "Ketidaksesuaian diagnosis ↔ tindakan",
      "Kemiripan tinggi dengan klaim CLM-240917-019",
    ],
  },
  {
    id: "CLM-240918-020",
    patient: "Pasien B-220",
    service: "Rawat jalan • Jantung",
    date: "18 Sep 2026",
    amount: "Rp 2.850.000",
    status: CLAIM_STATUS.ready,
    score: 18,
    diagnosis: "I10 — Hipertensi esensial",
    procedure: "93.96 — Terapi respirasi",
    length: "0 hari",
    flags: [],
  },
  {
    id: "CLM-240918-019",
    patient: "Pasien C-089",
    service: "Rawat inap • Interna",
    date: "17 Sep 2026",
    amount: "Rp 7.200.000",
    status: CLAIM_STATUS.approved,
    score: 8,
    diagnosis: "A09 — Gastroenteritis",
    procedure: "99.04 — Transfusi eritrosit",
    length: "3 hari",
    flags: [],
  },
  {
    id: "CLM-240918-018",
    patient: "Pasien D-312",
    service: "Rawat inap • Anak",
    date: "17 Sep 2026",
    amount: "Rp 5.100.000",
    status: CLAIM_STATUS.ready,
    score: 26,
    diagnosis: "J18.9 — Pneumonia",
    procedure: "93.90 — Respirasi buatan",
    length: "5 hari",
    flags: ["Durasi rawat di atas pola umum"],
  },
];

/**
 * Parsed through the schema at module load.
 *
 * `SEED` is typed as `Claim[]`, so a malformed record would already be a
 * compile error; parsing it anyway means a mistake that slips through the type
 * (a stray status string, an out-of-range score) fails loudly here rather than
 * rendering as a broken claim.
 */
export const seed: Claim[] = ClaimSchema.array().parse(SEED);
