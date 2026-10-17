# Proposal checklist — implementation status

The submitted proposal is the frozen reference. This checklist tracks code and
evidence against it; it does not edit the submitted proposal.

| Proposal item | Status | Evidence / remaining gap |
|---|---|---|
| Risk + readiness and before/after panel | Partial / demo mismatch | App fixture currently demonstrates 70 → 24; submitted proposal says 70 → 52. Preserve the proposal and either build a separate scripted 70 → 52 demo case or disclose the mismatch during demo. |
| `POST /api/v1/claims/analyze` + contract test | Implemented, beta only | Worker handler, shared Zod request/response schemas and contract tests. The UI does not call the Worker. |
| Hard cases | Partial | Explicit boundary suite added; synthetic generator and rule table are still not independently validated against real coder-reviewed claims. |
| Normal-set FPR <10% | Measured for fixed synthetic seed | Evaluation reports aggregate and per-rule normal-set FPR; fixed run gives 0/133. Gate is in tests. This is not an external validation result. |
| ≤1 second per claim | Local evaluation measured | Batch evaluator reports elapsed time and test gates under one second for its fixture. Not a production/cloud latency SLA. |
| Every finding has reason + source/evidence | Implemented in contract | Flag schema requires nonblank reason/source and evidence; tests check generated and API findings. Evidence is currently a deterministic snapshot of claim fields, not linked document bytes. |
| LOS anomaly confidence/cohort basis | Open | Current LOS rule is a synthetic per-diagnosis threshold. No statistical cohort, calibrated confidence or RMIK validation. |
| Rule basis in UI | Implemented | Rules have official/local/synthetic basis; Rules panel displays it. |
| Import/batch/export | JSON import/export + beta batch API implemented | Local app validates JSON imports and exports claims; Worker also has validated batch analyze (1–500 claims) and JSON export endpoints. No CSV support; app remains local-only. |
| RMIK review/contact | Open, external dependency | No review evidence found in repository. Do not claim domain validation. |
| `docker-compose.yml` | Implemented | Static demo app container; does not deploy the Worker. |
| README / clean clone | Partial | README updated. Clean-clone build/run has not yet been independently verified. |
| Backup demo video | Open, external deliverable | No video asset found in repository. |

## Verification recorded

- `bun run typecheck`
- `bun run test` (core, app, Worker contract tests, agent-browser e2e)
- `bun run evaluate` (fixed synthetic seed; output includes FPR and elapsed time)
