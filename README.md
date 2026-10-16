# PreClaim Guard — Healthkathon 2026

**Detect before submit. Explain before reject.**

PreClaim Guard is a local-first prototype for hospital casemix coders. It checks synthetic claim drafts before submission, presents explainable findings, and keeps the final decision with the human coder.

## Repository layout

- `app/` — runnable Vite + React prototype
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

## Validate

```bash
cd app
npm run build
npx playwright test
```

The prototype uses synthetic data only. It is an explainable pre-submit quality gate, not an automatic fraud adjudication system.
