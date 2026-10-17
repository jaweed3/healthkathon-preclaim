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
| `proposal-draft.md` | Solution proposal |
| `archive/` | Previous proposal artifact |

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
bun run test        # core unit tests, then app e2e
bun run build       # app + deck
```

## Why `@preclaim/core` exists

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