# PreClaim Guard

<div align="center">
  <img src="Chameleon%20Healthcare%20Approval%20Mascot.png" alt="Maskot bunglon PreClaim Guard membawa perisai kesehatan dan checklist" width="300" />
  <h3>Asisten ramah untuk pemeriksaan klaim sebelum pengajuan.</h3>
  <p><strong>Temukan sinyal sebelum submit — keputusan tetap di tangan koder.</strong></p>
</div>

PreClaim Guard membantu koder casemix meninjau draf klaim sebelum diajukan.
Aplikasi menampilkan temuan pemeriksaan beserta alasan dan sumbernya, sementara
keputusan akhir tetap berada di tangan koder. Prototipe local-first ini
menggunakan **data sintetis saja**.

## Run

```bash
bun install && bun run dev     # http://127.0.0.1:5173
```

## What it does

- **Review before submission:** diagnosis–procedure plausibility, LOS threshold,
  supporting-document checks, claim similarity, local cohort anomaly, and an
  ICD-10-CM I.C.18.a–b check. Rule IDs, versions, sources, severities, and
  explanations are inspectable in the app.
- **Explainable findings:** each finding records its rule and evidence. A code
  revision reruns the affected check without silently dropping unrelated
  findings; risk and readiness are derived from the current findings.
- **Auditable decisions:** approval requires a coder note, and the decision trail
  records the findings present at approval.
- **Local-first demo:** browser claims stay in localStorage. The separate beta
  Worker API is not called by the app and accepts synthetic/demo data only.

The local-anomaly check is a transparent cohort heuristic—not trained ML, a
clinical standard, or a fraud probability. Both app and Worker share claim
schemas from `@preclaim/core`.

## Development

| Command | Purpose |
| --- | --- |
| `bun install && bun run dev` | Run app at `http://127.0.0.1:5173` |
| `bun run test` | Core, Worker, app, and browser tests |
| `bun run typecheck` | Typecheck core and Worker |
| `bun run evaluate` | Evaluate rules on synthetic claims |
| `bun run build` | Build app and pitch deck |
| `bun run worker:dev` | Run the separate beta API locally |

## Project map

`packages/core/` contains shared schemas and rules; `app/` is the React/Vite
prototype; `worker/` is the separate Cloudflare beta API; `tests/` centralizes
unit, contract, and browser tests; and `docs/` contains supporting references
and the Bruno API collection.

## References

- [Limitations and evaluation notes](docs/limitation.md)
- [Beta API request collection (Bruno)](docs/beta-api)
- [Proposal](docs/proposal.pdf) · [Pitch deck](docs/deck.pdf)
