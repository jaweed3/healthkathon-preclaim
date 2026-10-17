import { PLAUSIBLE } from "./scoring";

/**
 * The inspection rules, described well enough for a coder to argue with.
 *
 * `enforcement` is the honest distinction the UI surfaces:
 *
 * - `computed` — the prototype derives the finding from claim data at runtime.
 * - `declared`  — the finding ships with the synthetic fixture. It represents a
 *   real control the production system would need, but nothing in this codebase
 *   calculates it. Claiming otherwise would undercut the whole "explainable"
 *   premise, so the rules view labels it.
 */
export type RuleEnforcement = "computed" | "declared";

export type DiagnosisPair = { diagnosis: string; codes: string[] };

export type InspectionRule = {
  id: string;
  title: string;
  description: string;
  enforcement: RuleEnforcement;
  pairs?: DiagnosisPair[];
};

export const INSPECTION_RULES: InspectionRule[] = [
  {
    id: "dx-procedure",
    title: "Kesesuaian diagnosis ↔ tindakan",
    description:
      "Setiap diagnosis hanya menerima daftar kode tindakan tertentu. Kode di luar daftar itu skornya naik dan klaim tetap ditahan untuk ditinjau — revisi tidak bisa mengubahnya menjadi hijau.",
    enforcement: "computed",
    pairs: Object.entries(PLAUSIBLE).map(([diagnosis, codes]) => ({
      diagnosis,
      codes,
    })),
  },
  {
    id: "length-of-stay",
    title: "Durasi rawat di atas pola umum",
    description:
      "Membandingkan lama rawat dengan pola diagnosis yang sama di fasilitas ini. Pola berbeda antar RS, jadi aturan harus dikalibrasi lokal.",
    enforcement: "declared",
  },
  {
    id: "similarity",
    title: "Kemiripan klaim",
    description:
      "Mendeteksi diagnosis, tindakan, dan lama rawat yang mirip dengan klaim lain — penanda klaim tertukar atau terduplikasi.",
    enforcement: "declared",
  },
  {
    id: "missing-evidence",
    title: "Dokumen pendukung",
    description:
      "Menandai klaim bertindakan invasif tanpa resume medis atau dokumen pendukung yang tercatat.",
    enforcement: "declared",
  },
];

/** Only the rules the prototype actually evaluates against claim data. */
export const COMPUTED_RULES = INSPECTION_RULES.filter(
  (r) => r.enforcement === "computed",
);
