import raw from "../../rules.json";
import { RuleSetSchema, type Rule, type RuleSet } from "./schema";

/**
 * The loaded, validated policy.
 *
 * Validated once at module load: a malformed or unknown rule is a build-time
 * failure, not something a coder discovers as a wrong finding on a claim.
 */
export const POLICY: RuleSet = RuleSetSchema.parse(raw);

export const ruleById = (id: string): Rule | undefined =>
  POLICY.rules.find((r) => r.id === id);

export const ruleByType = (type: Rule["type"]): Rule | undefined =>
  POLICY.rules.find((r) => r.type === type);

export { POLICY as default };
