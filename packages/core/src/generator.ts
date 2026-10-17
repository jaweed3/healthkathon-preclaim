import { amountOf, codeOf, daysOf } from "./codes";
import { allowedCodes, evaluateRules, knownDiagnoses, POLICY } from "./rules";
import type { Claim, Flag } from "./schema";

/**
 * Deterministic synthetic claim generator.
 *
 * Produces claims with *known* anomalies so rule behaviour can be measured
 * rather than asserted. Each generated claim carries the set of rule ids it was
 * built to trigger, computed from how it was constructed — never by running the
 * rules, which would be circular.
 *
 * LIMITATION, stated here because it matters for the write-up: this measures
 * the generator as much as the detector. A rule that fires exactly when the
 * generator says it should looks perfect by construction. The number is a
 * regression guard against a rule silently going dead, not evidence of accuracy
 * against real claim data. See `evaluate.ts` for what the metrics do mean.
 */

export type RuleId = string;

export type Generated = {
  claim: Claim;
  /** Rule ids this claim was constructed to trigger. */
  expected: RuleId[];
  /** Labels describing which anomalies were injected. */
  injected: string[];
};

/** Explicit edge cases, independent from the randomized synthetic corpus. */
export type HardCase = {
  name: string;
  claim: Claim;
  expectedRuleIds: string[];
};

export type GeneratorOptions = {
  count: number;
  seed?: number;
  /** Share of claims with at least one injected anomaly. */
  anomalyRate?: number;
};

/** Deterministic PRNG so a given seed always yields the same dataset. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rnd: () => number, xs: readonly T[]): T =>
  xs[Math.floor(rnd() * xs.length)];

/** Procedure codes the policy treats as requiring supporting documents. */
function invasiveCodes(): string[] {
  const rule = POLICY.rules.find((r) => r.type === "required_evidence");
  return rule && rule.type === "required_evidence"
    ? rule.params.procedures
    : [];
}

/** Typical length of stay per diagnosis, as configured in the policy. */
function typicalLos(): Record<string, number> {
  const rule = POLICY.rules.find((r) => r.type === "los_threshold");
  return rule && rule.type === "los_threshold" ? rule.params.typical : {};
}

const DOCS = ["Resume medis", "Hasil lab", "Foto rontgen"];
const SERVICES = [
  "Rawat inap • Bedah",
  "Rawat inap • Interna",
  "Rawat inap • Anak",
  "Rawat jalan",
];
const SYMPTOM_DX = [
  "R10.4 — Nyeri perut bagian atas",
  "R50.9 — Demam, tidak disebutkan",
];

export function generate(options: GeneratorOptions): Generated[] {
  const { count, seed = 20261017, anomalyRate = 0.4 } = options;
  const rnd = mulberry32(seed);

  const diagnoses = knownDiagnoses();
  const los = typicalLos();
  const invasive = invasiveCodes();
  const out: Generated[] = [];

  for (let i = 0; i < count; i++) {
    const wantsAnomaly = rnd() < anomalyRate;
    const injected: string[] = [];

    // A small share of claims use a diagnosis the policy has no table for.
    const useUnknownDx = rnd() < 0.12;
    const diagnosis = useUnknownDx
      ? pick(rnd, SYMPTOM_DX)
      : `${pick(rnd, diagnoses)} — Kode demo`;

    const ownCodes = allowedCodes(codeOf(diagnosis));
    const allCodes = [...new Set(diagnoses.flatMap((d) => allowedCodes(d)))];

    // dx_procedure anomaly: a code that belongs to a different diagnosis.
    const breakDx = wantsAnomaly && ownCodes.length > 0 && rnd() < 0.3;
    // A diagnosis with no table has nothing to break against and nothing to
    // pick from, so fall back to any code the policy knows.
    const foreign = allCodes.filter((c) => !ownCodes.includes(c));
    const procedureCode = breakDx
      ? pick(rnd, foreign.length > 0 ? foreign : allCodes)
      : pick(rnd, ownCodes.length > 0 ? ownCodes : allCodes);

    // los anomaly: stay longer than the configured typical value.
    const typical = los[codeOf(diagnosis)] ?? 0;
    const breakLos = wantsAnomaly && typical > 0 && rnd() < 0.25;
    const lengthDays = breakLos ? typical + 2 + Math.floor(rnd() * 5) : typical;
    const length = `${lengthDays} hari`;

    // missing_evidence anomaly: invasive code, no documents attached.
    const needsDocs = invasive.includes(procedureCode);
    const omitDocs = wantsAnomaly && needsDocs && rnd() < 0.5;

    // icd10_ch18 anomaly: symptom primary *and* a definitive diagnosis present.
    const isSymptomPrimary = codeOf(diagnosis).toUpperCase().startsWith("R");
    const breakIcd10 = isSymptomPrimary && rnd() < 0.35;
    const establishedDiagnoses = breakIcd10
      ? ["K35.8 — Apendisitis akut"]
      : undefined;

    if (breakDx) injected.push("dx_procedure");
    if (breakLos) injected.push("length-of-stay");
    if (needsDocs && omitDocs) injected.push("missing-evidence");
    if (breakIcd10) injected.push("icd10-ch18-primary");

    out.push({
      claim: {
        id: `SYN-${String(i + 1).padStart(4, "0")}`,
        patient: `Pasien SYN-${String(i + 1).padStart(3, "0")}`,
        service: pick(rnd, SERVICES),
        date: "18 Sep 2026",
        amount: `Rp ${formatIdr(amountFor(rnd))}`,
        status: "Perlu ditinjau",
        score: 0,
        readiness: 0,
        diagnosis,
        procedure: procedureCode,
        length,
        flags: [],
        documents: omitDocs || !needsDocs ? undefined : [pick(rnd, DOCS)],
        establishedDiagnoses,
      },
      expected: [],
      injected,
    });
  }

  // similarity is a set-level relationship, so its ground truth can only be
  // decided once the whole set exists.
  injectNearMisses(out, rnd);
  injectDuplicates(out, rnd);
  markExpected(out);
  return out;
}

/** The fields the similarity rule compares, as configured in the policy. */
function signatureOf(claim: Claim): string {
  return [
    codeOf(claim.diagnosis),
    codeOf(claim.procedure),
    daysOf(claim.length),
    amountOf(claim.amount),
  ].join("|");
}

/**
 * Claims that share coding with an earlier claim but differ in amount.
 *
 * These are the negative cases for the similarity rule: same diagnosis,
 * procedure and stay, different money. A rule with too loose a signature
 * flags them, which is how the earlier over-broad signature was caught.
 */
function injectNearMisses(claims: Generated[], rnd: () => number): void {
  const share = 0.1;
  const total = claims.length;
  let made = 0;

  for (let i = 0; i < total && made < Math.floor(total * share); i++) {
    if (rnd() > 0.3) continue;

    const source = claims[i];
    const shifted = amountFor(rnd) + 500_000;

    claims.push({
      claim: {
        ...source.claim,
        id: `SYN-N${String(made + 1).padStart(3, "0")}`,
        patient: `Pasien NEAR-${String(made + 1).padStart(3, "0")}`,
        amount: `Rp ${formatIdr(shifted)}`,
      },
      expected: [],
      injected: source.injected.filter((x) => x !== "similarity"),
    });
    made++;
  }
}

/** A plausible claim value with enough spread that collisions are meaningful. */
function amountFor(rnd: () => number): number {
  return 250_000 + Math.floor(rnd() * 400) * 250_000;
}

function formatIdr(value: number): string {
  return value.toLocaleString("id-ID").replace(/\u00a0/g, " ");
}

/** Copy a fraction of claims into near-exact duplicates. */
function injectDuplicates(claims: Generated[], rnd: () => number): void {
  const share = 0.08;
  const total = claims.length;
  let made = 0;

  for (let i = 0; i < total && made < Math.floor(total * share); i++) {
    if (rnd() > 0.25) continue;

    const source = claims[i];
    // Match every compared field, differ only in identity and money.
    const copy: Generated = {
      claim: {
        ...source.claim,
        id: `SYN-D${String(made + 1).padStart(3, "0")}`,
        patient: `Pasien DUP-${String(made + 1).padStart(3, "0")}`,
        amount: source.claim.amount,
      },
      expected: [],
      injected: [...source.injected, "similarity"],
    };

    // The original gains the relationship retroactively.
    source.injected.push("similarity");
    claims.push(copy);
    made++;
  }
}

/**
 * Derive what each claim *should* trigger from its construction.
 *
 * Intentionally independent of the evaluators: if this ran the rules to decide
 * the expected set, every metric would be trivially 1.0.
 */
function markExpected(claims: Generated[]): void {
  const los = typicalLos();

  // similarity ground truth: pairs agreeing on every compared field.
  const bySignature = new Map<string, Generated[]>();
  for (const g of claims) {
    const signature = signatureOf(g.claim);
    const bucket = bySignature.get(signature) ?? [];
    bucket.push(g);
    bySignature.set(signature, bucket);
  }

  for (const g of claims) {
    const expected = new Set<string>(g.injected);

    const own = allowedCodes(codeOf(g.claim.diagnosis));
    if (own.length === 0) {
      // Uncheckable diagnosis: reported at info level, still "expected".
      expected.add("dx-procedure");
    } else if (!own.includes(codeOf(g.claim.procedure))) {
      expected.add("dx-procedure");
    }

    const typical = los[codeOf(g.claim.diagnosis)];
    if (typical !== undefined && daysOf(g.claim.length) > typical)
      expected.add("length-of-stay");

    const invasive = invasiveCodes();
    if (
      invasive.includes(codeOf(g.claim.procedure)) &&
      (g.claim.documents?.length ?? 0) === 0
    ) {
      expected.add("missing-evidence");
    }

    const signature = signatureOf(g.claim);
    if ((bySignature.get(signature) ?? []).length > 1)
      expected.add("similarity");

    // Independent synthetic label for the local baseline: reproduce only its
    // declared cohort/statistical condition, not its evaluator output.
    const anomalyRule = POLICY.rules.find((r) => r.type === "local_anomaly");
    if (anomalyRule?.type === "local_anomaly") {
      const cohort = claims
        .map((x) => x.claim)
        .filter(
          (candidate) =>
            candidate.id !== g.claim.id &&
            anomalyRule.params.cohortFields.every((field) =>
              field === "service"
                ? candidate.service === g.claim.service
                : codeOf(candidate.diagnosis) === codeOf(g.claim.diagnosis),
            ),
        );
      if (cohort.length >= anomalyRule.params.minimumCohort) {
        const outlier = anomalyRule.params.features.some((feature) => {
          const values = cohort.map((c) =>
            feature === "length" ? daysOf(c.length) : amountOf(c.amount),
          );
          const value =
            feature === "length"
              ? daysOf(g.claim.length)
              : amountOf(g.claim.amount);
          const mean = values.reduce((sum, n) => sum + n, 0) / values.length;
          const variance =
            values.reduce((sum, n) => sum + (n - mean) ** 2, 0) / values.length;
          const stddev = Math.sqrt(variance);
          return (
            stddev > 0 &&
            Math.abs((value - mean) / stddev) >= anomalyRule.params.zThreshold
          );
        });
        if (outlier) expected.add(anomalyRule.id);
      }
    }

    g.expected = [...expected];
  }
}

/** Attach the flags the rules actually produce, per claim. */
export function runRules(
  generated: Generated[],
): { claim: Claim; expected: RuleId[]; actual: Flag[] }[] {
  const claims = generated.map((g) => g.claim);
  const byId = new Map(claims.map((c) => [c.id, c]));
  const context = [...byId.values()];

  return generated.map((g) => ({
    claim: g.claim,
    expected: g.expected,
    actual: evaluateRules({ claim: g.claim, claims: context }),
  }));
}

export function hardCaseSuite(): HardCase[] {
  const base = generate({ count: 1, seed: 901 })[0].claim;
  return [
    {
      name: "unknown diagnosis is advisory, not a false pass",
      claim: {
        ...base,
        id: "HC-UNKNOWN",
        diagnosis: "Z99.9 — kode tidak ada di tabel demo",
        procedure: "47.09",
      },
      expectedRuleIds: ["dx-procedure"],
    },
    {
      name: "symptom diagnosis without confirmed diagnosis remains valid",
      claim: {
        ...base,
        id: "HC-SYMPTOM",
        diagnosis: "R50.9 — Demam",
        procedure: "93.90",
        establishedDiagnoses: undefined,
      },
      expectedRuleIds: ["dx-procedure"],
    },
    {
      name: "symptom with definitive diagnosis is reviewed",
      claim: {
        ...base,
        id: "HC-SYMPTOM-CONFIRMED",
        diagnosis: "R50.9 — Demam",
        establishedDiagnoses: ["J18.9"],
      },
      expectedRuleIds: ["dx-procedure", "icd10-ch18-primary"],
    },
    {
      name: "exact duplicate with a separate identity is similar",
      claim: { ...base, id: "HC-DUPLICATE" },
      expectedRuleIds: ["similarity"],
    },
  ];
}
