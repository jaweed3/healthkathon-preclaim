import { formatReport, generate, evaluate } from "./index";

/**
 * Measure the loaded policy against a generated corpus.
 *
 * Run: `bun run --cwd packages/core evaluate [count] [seed]`
 */
const count = Number(process.argv[2] ?? 200);
const seed = Number(process.argv[3] ?? 20261017);

console.log(formatReport(evaluate(generate({ count, seed }))));
