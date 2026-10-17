import { z } from "zod";

/**
 * Schema for the versioned rule file.
 *
 * Policy is data; behaviour is not. Each entry names one of a fixed set of
 * evaluator types, so the JSON can express which rules exist and what they
 * assert, but never *how* they assert it. There is no expression to evaluate
 * and no way to write a rule the engine does not understand.
 *
 * That is the whole point: "policy-as-code" means the policy is reviewable in
 * a diff and reviewable by a coder. A rule language would be the opposite.
 */

const severity = z.enum(["warn", "info"]);

// Every evaluator type the engine implements. Adding one is a code change.
export const EVALUATOR_TYPES = [
  "dx_procedure",
  "los_threshold",
  "required_evidence",
  "similarity",
  "icd10_primary_diagnosis",
] as const;

const base = {
  id: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "harus semver, mis. 1.0.0"),
  severity,
  title: z.string().min(1),
  description: z.string().min(1),
  source: z.string().min(1),
};

export const RuleSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("dx_procedure"),
    params: z.object({
      message: z.string().min(1),
      pairs: z.record(z.string(), z.array(z.string().min(1))),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("los_threshold"),
    params: z.object({
      typical: z.record(z.string(), z.number().int().min(0)),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("required_evidence"),
    params: z.object({
      message: z.string().min(1),
      procedures: z.array(z.string().min(1)),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("similarity"),
    params: z.object({
      threshold: z.number().min(0).max(1),
      fields: z
        .array(z.enum(["diagnosis", "procedure", "length", "amount"]))
        .min(1),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("icd10_primary_diagnosis"),
    params: z.object({
      chapters: z.array(z.string().min(1)).min(1),
      message: z.string().min(1),
    }),
  }),
]);

export const RuleSetSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  rules: z.array(RuleSchema).min(1),
});

export type Rule = z.infer<typeof RuleSchema>;
export type RuleSet = z.infer<typeof RuleSetSchema>;
export type EvaluatorType = (typeof EVALUATOR_TYPES)[number];
