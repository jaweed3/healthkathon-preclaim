# PreClaim Guard — Healthkathon 2026

**Detect before submit. Explain before reject.**

PreClaim Guard is a local-first prototype for hospital casemix coders. It checks synthetic claim drafts before submission, presents explainable findings, and keeps the final decision with the human coder.

## Repository layout

- `app/` — runnable Vite + React prototype
- `worker/` — Cloudflare Worker holding the beta claim API. Deployed independently; the `app/` prototype does not call it yet (it runs fully local-first).
- `proposal-draft.md` — solution proposal
- `deck/` — pitch deck source and generated presentation
- `archive/` — previous proposal artifact

## Run the prototype

```bash
cd app
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

## Worker API

The beta claim API deploys independently of the prototype, which runs fully
local-first and does not call it.

```bash
cd worker
npm install
npm run typecheck
npm run dev      # or: npm run deploy
```

`GET /health` and `GET /api/claims` return synthetic data only.

## Validate

```bash
cd app
npm run build
npm test
```

The prototype uses synthetic data only. It is an explainable pre-submit quality gate, not an automatic fraud adjudication system.
