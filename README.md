# PreClaim Guard

**Detect before submit. Explain before reject.**

A local-first quality gate for hospital casemix coders. It checks claim drafts
before submission, shows what fired and why, and leaves the decision to the
human. Synthetic data only.

## Run

```bash
bun install && bun run dev     # http://127.0.0.1:5173
```

## Commands

| | |
|---|---|
| `bun run dev` | app on :5173 |
| `bun run test` | 116 core unit + 73 e2e |
| `bun run typecheck` | core + worker |
| `bun run evaluate` | precision/recall per rule on 237 generated claims |
| `bun run build` | app + deck |
| `bun run worker:dev` | beta API (not called by the app) |

## Layout

```
packages/core/   domain: rules.json policy, evaluators, scoring, Zod schemas
app/             React + Vite prototype      app/test/ Playwright
worker/          Cloudflare Worker, beta API
deck/            pitch deck
docs/            symlinks to proposal and deck artifacts
```

Both the app and the worker import the claim vocabulary from `@preclaim/core`,
so a status string cannot drift between them.

## What it does

Four executable rules, each with `id`, `version`, `source` and `severity` in
`packages/core/rules.json`: diagnosis↔procedure plausibility, length-of-stay
threshold, missing supporting documents, and claim-to-claim similarity. A fifth
rule follows ICD-10-CM guideline I.C.18.a–b. The rules panel shows each one
with its source; a coder can read a finding and disagree with it.

Findings carry the rule that produced them. Correcting a procedure re-runs
only the diagnosis rule, so an unrelated finding — a similarity warning, say —
survives instead of being quietly deleted. The risk score is derived from the
findings, so the number on screen and the warnings beside it cannot disagree.

Every decision is recorded. Approving a claim requires a written note and
stores the findings it overrode; the trail survives a reload.

## Honest limits

`bun run evaluate` reports 100% precision and recall per rule. That measures
whether the detector still agrees with cases **we** generated — a regression
guard, not real-world accuracy. Real accuracy needs real claims reviewed by a
coder, which is a pilot concern. The only non-synthetic rule is the ICD-10 one;
the dx↔procedure table is invented for the demo and has not been validated by
an RMIK.

Proposal: [`docs/proposal.pdf`](docs/proposal.pdf) · Deck: [`docs/deck.pdf`](docs/deck.pdf)