import { evaluateAll } from "./rules";
import { CLAIM_STATUS, ClaimSchema, type Claim } from "./schema";

/**
 * Raw fixture shape: score, readiness, status and flags are all derived by the
 * rule engine, so writing them by hand would only create something to keep in
 * sync.
 */
export type SeedDraft = Omit<Claim, "flags" | "history" | "score" | "readiness" | "status">;

/**
 * Fixture claims. Synthetic only — no real patient information.
 *
 * Flags are deliberately absent: they are derived from the rule set at module
 * load rather than written by hand. The previous fixture carried a similarity
 * flag pointing at `CLM-240917-019`, a claim that did not exist in the
 * dataset, so no amount of evaluating the rules could reproduce it.
 */
const SEED_DATA: SeedDraft[] = [
  {
    id: "CLM-260918-021",
    patient: "Pasien A-104",
    service: "Rawat inap • Bedah",
    date: "18 Sep 2026",
    amount: "Rp 18.450.000",
    diagnosis: "K35.8 — Apendisitis akut",
    procedure: "99.04 — Transfusi eritrosit",
    length: "4 hari",
  },
  {
    id: "CLM-260918-020",
    patient: "Pasien B-220",
    service: "Rawat inap • Interna",
    date: "18 Sep 2026",
    amount: "Rp 7.150.000",
    diagnosis: "A09 — Gastroenteritis",
    procedure: "99.04 — Transfusi eritrosit",
    length: "4 hari",
    documents: ["Resume medis"],
  },
  {
    // Near-duplicate of CLM-260918-020: same diagnosis, procedure and length.
    // Exists so the similarity rule has a real pair to find.
    id: "CLM-260918-019",
    patient: "Pasien C-089",
    service: "Rawat inap • Interna",
    date: "18 Sep 2026",
    amount: "Rp 7.150.000",
    diagnosis: "A09 — Gastroenteritis",
    procedure: "99.04 — Transfusi eritrosit",
    length: "4 hari",
  },
  {
    id: "CLM-260918-018",
    patient: "Pasien D-312",
    service: "Rawat inap • Anak",
    date: "18 Sep 2026",
    amount: "Rp 5.100.000",
    diagnosis: "J18.9 — Pneumonia",
    procedure: "93.90 — Respirasi buatan",
    length: "9 hari",
  },
  {
    id: "CLM-260918-017",
    patient: "Pasien E-405",
    service: "Rawat jalan • Jantung",
    date: "18 Sep 2026",
    amount: "Rp 2.850.000",
    diagnosis: "I10 — Hipertensi esensial",
    procedure: "93.96 — Terapi respirasi",
    length: "0 hari",
    documents: ["Catatan poliklinik"],
  },
];

export const seed: Claim[] = evaluateAll(
  SEED_DATA.map((c) => ({
    ...c,
    flags: [],
    status: CLAIM_STATUS.review,
    score: 0,
    readiness: 0,
  })),
);

// Parse on load so a malformed fixture fails here rather than in the UI.
ClaimSchema.array().parse(seed);

/** Fixture only, before any rules ran — useful for tests and the generator. */
export const rawSeed: SeedDraft[] = SEED_DATA;
