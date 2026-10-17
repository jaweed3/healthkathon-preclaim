# PreClaim Guard Beta API — Bruno collection

Requests here target only the synthetic-data beta Worker. The app does not call
this API. Never send real patient data.

## Run locally

1. From the repository root, start the Worker with `bun run worker:dev`.
2. Open this collection folder in Bruno and select the `local` environment.
3. Run individual requests or run the whole collection.

The local environment points to `http://127.0.0.1:8787`. For another Worker,
change `baseUrl` in the selected Bruno environment.

Requests cover health, the static synthetic claim list, single-claim analysis,
batch analysis, and JSON export. Analysis examples use synthetic placeholder
claims; replace them only with synthetic/demo data.
