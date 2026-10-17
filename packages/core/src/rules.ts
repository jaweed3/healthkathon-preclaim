import type { Claim, Flag } from "./schema";
import { codeOf, isPlausible, scoreFor, statusFor } from "./scoring";

/**
 * Procedure codes that need supporting documents before submission.
 *
 * Invasive or high-cost interventions are the ones a coder should not file on
 * a diagnosis page alone.
 */
const INVASIVE = new Set([
  "47.09",
  "47.11",
  "47.12", // appendectomy
  "93.90",
  "93.91", // mechanical ventilation
  "99.04", // transfusion
]);

/** Typical length of stay, in days, per diagnosis code. */
const TYPICAL_LOS: Record<string, number> = {
  "K35.8": 4,
  I10: 0,
  A09: 3,
  "J18.9": 5,
};

/** Two claims are "similar" when these three fields agree closely. */
const SIMILARITY_THRESHOLD = 0.8;

export type RuleContext = {
  claim: Claim;
  /** The full claim set, for rules that compare claims to each other. */
  claims: Claim[];
};

export type InspectionRule = {
  id: string;
  version: string;
  source: string;
  title: string;
  description: string;
  /** Flags this rule produces for a claim, and nothing else. */
  evaluate: (ctx: RuleContext) => Flag[];
};

const flag = (
  ruleId: string,
  message: string,
  severity: Flag["severity"] = "warn",
): Flag => ({
  ruleId,
  message,
  severity,
});

const days = (length: string): number => {
  const n = Number.parseInt(length, 10);
  return Number.isFinite(n) ? n : 0;
};

const overlap = (a: Claim, b: Claim): number => {
  const same = [
    codeOf(a.diagnosis) === codeOf(b.diagnosis),
    codeOf(a.procedure) === codeOf(b.procedure),
    days(a.length) === days(b.length),
  ].filter(Boolean).length;
  return same / 3;
};

export const INSPECTION_RULES: InspectionRule[] = [
  {
    id: "dx-procedure",
    version: "1.0.0",
    source: "Pola diagnosis↔tindakan internal (synthetic demo)",
    title: "Kesesuaian diagnosis ↔ tindakan",
    description:
      "Setiap diagnosis hanya menerima daftar kode tindakan tertentu. Kode di luar daftar itu skornya naik dan klaim tetap ditahan untuk ditinjau.",
    evaluate: ({ claim }) =>
      isPlausible(codeOf(claim.diagnosis), codeOf(claim.procedure))
        ? []
        : [flag("dx-procedure", "Kode tindakan tidak sesuai dengan diagnosis")],
  },
  {
    id: "length-of-stay",
    version: "1.0.0",
    source: "Pola lama rawat per diagnosis (synthetic demo)",
    title: "Durasi rawat di atas pola umum",
    description:
      "Membandingkan lama rawat dengan pola diagnosis yang sama. Pola berbeda antar RS, jadi angka ini harus dikalibrasi lokal.",
    evaluate: ({ claim }) => {
      const typical = TYPICAL_LOS[codeOf(claim.diagnosis)];
      if (typical === undefined) return [];
      return days(claim.length) > typical
        ? [
            flag(
              "length-of-stay",
              `Durasi rawat di atas pola umum (${claim.length}, biasanya ${typical} hari)`,
            ),
          ]
        : [];
    },
  },
  {
    id: "missing-evidence",
    version: "1.0.0",
    source: "SOP dokumen pendukung internal (synthetic demo)",
    title: "Dokumen pendukung",
    description:
      "Menandai tindakan invasif yang dikirim tanpa resume medis atau dokumen pendukung yang tercatat.",
    evaluate: ({ claim }) => {
      const invasive = INVASIVE.has(codeOf(claim.procedure));
      const documented = (claim.documents?.length ?? 0) > 0;
      return invasive && !documented
        ? [
            flag(
              "missing-evidence",
              "Tindakan invasif tanpa dokumen pendukung tercatat",
              "info",
            ),
          ]
        : [];
    },
  },
  {
    id: "similarity",
    version: "1.0.0",
    source: "Perbandingan antar klaim (synthetic demo)",
    title: "Kemiripan klaim",
    description:
      "Mendeteksi diagnosis, tindakan, dan lama rawat yang mirip dengan klaim lain — penanda klaim tertukar atau terduplikasi.",
    evaluate: ({ claim, claims }) => {
      const near = claims
        .filter((c) => c.id !== claim.id)
        .map((c) => ({ id: c.id, score: overlap(claim, c) }))
        .filter((c) => c.score >= SIMILARITY_THRESHOLD)
        .sort((a, b) => b.score - a.score);

      return near
        .slice(0, 1)
        .map((n) =>
          flag(
            "similarity",
            `Kemiripan ${Math.round(n.score * 100)}% dengan klaim ${n.id}`,
          ),
        );
    },
  },
];

/**
 * Run every rule and return the flags it produces.
 *
 * Each rule returns only its own flags, so a recompute replaces one rule's
 * contribution without disturbing the others. A revision that fixes
 * diagnosis↔tindakan must not silently delete a similarity finding.
 */
export function evaluateRules(ctx: RuleContext): Flag[] {
  return INSPECTION_RULES.flatMap((r) => r.evaluate(ctx));
}

/**
 * Replace only the flags owned by `ruleId`, leaving every other rule's flags
 * intact.
 *
 * Fresh flags attributed to a different rule are dropped rather than merged:
 * this function exists to refresh one rule's contribution, so letting it
 * introduce another rule's flags would quietly corrupt ownership.
 */
export function replaceFlagsForRule(
  existing: Flag[],
  ruleId: string,
  fresh: Flag[],
): Flag[] {
  return [
    ...existing.filter((f) => f.ruleId !== ruleId),
    ...fresh.filter((f) => f.ruleId === ruleId),
  ];
}

/**
 * Re-run one rule across the whole claim set.
 *
 * Flags, score and status are refreshed together. Refreshing flags alone would
 * leave a claim showing 18/100 "Aman" while a warning sits on screen — the
 * score has to be a function of the findings, never a parallel number.
 */
export function recomputeRule(claims: Claim[], ruleId: string): Claim[] {
  const rule = INSPECTION_RULES.find((r) => r.id === ruleId);
  if (!rule) return claims;

  const next = claims.map((claim) => {
    const fresh = rule.evaluate({ claim, claims });
    return { ...claim, flags: replaceFlagsForRule(claim.flags, ruleId, fresh) };
  });

  return next.map(settle);
}

/** Bring a claim's derived fields in line with its flags. */
function settle(claim: Claim): Claim {
  const score = scoreFor(claim.flags);
  return { ...claim, score, status: statusFor(score, claim.flags) };
}

/** Re-run every rule from scratch and refresh score and status. */
export function evaluateAll(claims: Claim[]): Claim[] {
  return claims.map((claim) =>
    settle({ ...claim, flags: evaluateRules({ claim, claims }) }),
  );
}

/** Build a claim's starting flags from a full evaluation. */
export function initialFlags(claim: Claim, claims: Claim[]): Flag[] {
  return evaluateRules({ claim, claims });
}
