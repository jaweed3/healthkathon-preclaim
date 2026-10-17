# PreClaim Guard — Healthkathon 2026

**Detect before submit. Explain before reject.**

PreClaim Guard is a local-first prototype for hospital casemix coders. It checks synthetic claim drafts before submission, presents explainable findings, and keeps the final decision with the human coder.

Built with [Bun](https://bun.sh) workspaces. Requires Bun 1.3+.

## Repository layout

Bun workspace monorepo — one `bun install` at the root covers everything.

| Path | Purpose |
| --- | --- |
| `packages/core/` | Shared claim domain logic: status vocabulary, scoring rules, synthetic data. The single source of truth consumed by both the app and the worker. |
| `app/` | Runnable Vite + React prototype |
| `worker/` | Cloudflare Worker holding the beta claim API. Deployed independently; the prototype does not call it yet (it runs fully local-first). |
| `deck/` | Pitch deck source and generated presentation |
| `archive/` | Superseded drafts and previous artifacts |
| `Proposal_PreClaim_Guard_Healthkathon_2026.tex` | Proposal source |
| `proposal-preclaim-guard.pdf` | Rendered proposal |

## Setup

```bash
bun install
```

That is the only install step. It creates one root `bun.lock` and links the
workspace packages.

## Run the prototype

```bash
bun run dev
```

Open `http://127.0.0.1:5173/`.

Click the risky claim `CLM-240918-021`, then **↺ Revisi kode**, and try two
things: a plausible code (`47.11`) clears the claim, while an implausible one
(`99.04`) is rejected and the score rises to 82. Your reason and evidence
checkbox are recorded in `localStorage` under `preclaim-audit-log`.

## Worker API

```bash
bun run worker:dev       # or: bun run worker:deploy
```

`GET /health` and `GET /api/claims` return synthetic data only.

## Validate

```bash
bun run typecheck   # core + worker
bun run test        # 43 core unit tests, then 35 app e2e (Playwright)
bun run build       # app + deck
```

## What the prototype does

- **Filter** — `Semua` / `Berisiko` chips (score ≥ 60) and a `Perlu ditinjau`
  nav filter (by status). These are separate filters with separate counts;
  they were previously conflated, so the badge disagreed with the rows.
- **Add claim** — `Klaim` in the list header. The draft is scored by the same
  rule set as the revision flow, so a claim cannot enter as "clean" just
  because it was typed in rather than revised.
- **Aturan pemeriksaan** — the rules behind the findings, with the
  diagnosis→procedure table. Rules the prototype actually computes are badged
  `dihitung`; rules that only ship with the fixture are badged `dideklarasi`.
  A coder should be able to read a finding and disagree with it — that is the
  whole premise.

## Layout

```
packages/core/   Zod schemas + inferred types + scoring rules + seed data
app/             Vite + React prototype
  src/components/   presentational components
  src/lib/          infrastructure: storage.ts, audit-log.ts
  test/             Playwright specs
worker/          Cloudflare Worker beta API
deck/            Pitch deck
```

Core unit tests are `*.test.ts` and run on `bun test`; the app specs are
`*.spec.ts` and run on Playwright.

## Why Zod

`@preclaim/core` defines the domain as Zod schemas and **infers** the
TypeScript types from them, so the runtime contract and the compile-time types
cannot drift apart the way a hand-written interface and a hand-written parser
eventually do.

Validation is applied where input is actually untrusted:

- **The audit log.** `localStorage` is shared with every script on the origin
  and persists forever. `readAudit()` parses through `AuditLogSchema`, so a
  hand-edited or half-written entry is discarded instead of being shown as
  though it were a real coder justification. All `localStorage` access goes
  through `app/src/lib/storage.ts`, which centralises the failure modes
  (private browsing, quota, cross-script writes).
- **The seed data**, parsed once at module load so a malformed claim fails
  loudly rather than rendering broken.
- **The worker's own responses**, validated at startup with the same schema a
  client would use — drift fails in CI rather than in a consumer.

Note `nonBlank` rather than `z.string().min(1)`: the latter accepts `"   "`,
which is not a justification.

Synthetic internals that are already compile-time constants are deliberately
left unvalidated.

## The audit trail

`appendAudit` is called on every confirmed revision, and the resulting
history is rendered in the claim detail panel under **Riwayat revisi** — score
delta, old → new code, the coder's stated reason, and whether they confirmed
they checked supporting evidence. It is read back from `localStorage`, so it
survives a reload rather than living only in React state.

That was the gap this closes: the modal was labelled *"Revisi kode secara
auditable"* and persisted a trail, but nothing ever displayed it. A write-only
audit log is not an audit trail.

The worker used to carry its own copy of the claim status vocabulary
(`review`/`ready`/`approved`) while the app used
`Perlu ditinjau`/`Siap submit`/`Disetujui`. Two sources of truth for one
concept, free to drift. Both now import `CLAIM_STATUS` from
`packages/core`, so the drift is structurally impossible.

The scoring rule lives there too. An implausible diagnosis/procedure pair
scores 82 — above the review threshold — which is what stops the revision
flow from being a rubber stamp that greens any claim.
`packages/core/src/scoring.test.ts` locks that behaviour down.

The prototype uses synthetic data only. It is an explainable pre-submit quality gate, not an automatic fraud adjudication system.