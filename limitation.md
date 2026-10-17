## Honest limits

1. `bun run evaluate` reports per-rule precision and recall, false-positive rate on
   the generated normal subset, and evaluator elapsed time.

2. The current fixed seed produces 237 claims, 133 normal claims, 0% normal-set FPR, and a sub-second
   evaluation on this development machine. These are reproducible synthetic
   regression measurements, not a production latency guarantee.

3. It also reports 100% precision and recall per rule. That measures whether the detector still agrees with cases **we** generated — a regression
   guard, not real-world accuracy. Real accuracy needs real claims reviewed by a
   coder, which is a pilot concern.

4. The only non-synthetic rule is the ICD-10 one;
   the dx↔procedure table is invented for the demo and has not been validated by
   an RMIK.

Proposal: [`docs/proposal.pdf`](docs/proposal.pdf) · Deck: [`docs/deck.pdf`](docs/deck.pdf)
