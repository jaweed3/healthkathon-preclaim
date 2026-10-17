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
| `bun run test` | Core + app + Worker contract + agent-browser e2e |
| `bun run typecheck` | core + worker |
| `bun run evaluate` | per-rule precision/recall, normal-set FPR, and runtime on synthetic claims |
| `bun run build` | app + deck |
| `bun run worker:dev` | beta API (not called by the app) |
| `docker compose up --build` | static app demo on http://localhost:4173 |

## Layout

```
packages/core/   domain: rules.json policy, evaluators, scoring, Zod schemas
app/             React + Vite prototype      app/test/ agent-browser e2e
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

## Beta API

The Cloudflare Worker exposes validated synthetic-only endpoints:

- `POST /api/v1/claims/analyze` — analyze one claim, optionally against peer claims.
- `POST /api/v1/claims/batch` — validate and analyze 1–500 claims.
- `POST /api/v1/claims/export` — export validated claims as JSON.
- `GET /api/claims` and `GET /health` — beta listing and health check.

The app remains localStorage-only and does not call the Worker. It supports
validated JSON import/export in the browser. Do not send real patient data to
the beta API. Handler, HTTP response helpers, and domain schemas are kept in
separate modules.

## Honest limits

`bun run evaluate` reports per-rule precision and recall, false-positive rate on
the generated normal subset, and evaluator elapsed time. The current fixed seed
produces 237 claims, 133 normal claims, 0% normal-set FPR, and a sub-second
evaluation on this development machine. These are reproducible synthetic
regression measurements, not a production latency guarantee. It also reports
100% precision and recall per rule. That measures
whether the detector still agrees with cases **we** generated — a regression
guard, not real-world accuracy. Real accuracy needs real claims reviewed by a
coder, which is a pilot concern. The only non-synthetic rule is the ICD-10 one;
the dx↔procedure table is invented for the demo and has not been validated by
an RMIK.

Proposal: [`docs/proposal.pdf`](docs/proposal.pdf) · Deck: [`docs/deck.pdf`](docs/deck.pdf)
