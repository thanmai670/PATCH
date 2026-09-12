# Two people work in parallel against a frozen contract and a golden fixture

With ~3 hours and two people, the dominant risk is one person idling while the other
finishes a dependency. We froze `src/contract/schema.ts` (Zod) up front and committed
`fixtures/atlas-infection.json`, a complete, realistic `InfectionReport`. Workstream B
builds the entire Contagion View against the fixture and never waits for a live agent;
Workstream A builds agents that emit that exact shape and never waits for UI.

## Consequences

The contract is the one file neither person may change alone — a unilateral edit
silently breaks the other. Changes go through the integration issue.

The fixture is also the demo fallback: if the agent pipeline is broken at minute 165,
`?fixture=1` renders the full Contagion View with real-looking data, and the demo still
runs. This is deliberate, not an accident.

## Considered options

Integrate-as-you-go was rejected: it serialises the work and puts the first end-to-end
test at minute 120, which is far too late to discover a shape mismatch.
