# Architecture

```
Slack #project-atlas
  │  someone reacts 🩹  (ADR-0004: unfiltered onReaction + rawEmoji match)
  ▼
┌─ Mastra graph ── thin layer over six pure functions (ADR-0003) ──────────────┐
│                                                                              │
│  1 interpreter  message + thread ─────────────► TruthChange                  │
│  2 evidence     Exa search_and_contents ──────► Evidence[]  (live/cached)    │
│  3 tracer       Ambiguous POST /search ───────► candidate artefacts          │
│  4 classifier   per artefact ─────────────────► status × disposition         │
│                                                 + matchKind + confidence     │
│  5 planner      per artefact ─────────────────► RepairSurfaceKind + props    │
│                                                                              │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               ▼
                        InfectionReport          ◄── fixtures/atlas-infection.json
                               │                     (B builds against this)
                               ▼
                      Contagion View (CopilotKit)
                               │  human lassoes, decides, approves
                               ▼
                          RepairPlan
                               ▼
│  6 executor     Ambiguous writes ─────────────► ExecutionReport
                               ▼
              Audit card back into the Slack thread
```

## Why six agents and not one

Each agent has a different job, a different output schema, and a different model
(ADR-0005). Extraction work is cheap and fast; the classifier is where the
historical-vs-irreversible judgement actually happens and gets the stronger model.
`AgentTraceEntry` records what really ran — that panel is the proof on stage.

## The two gates

PATCH does not start on its own (**nomination**) and does not write without a
human-approved `RepairPlan` (**approval**). Both are deliberate — see ADR-0006.

## Surface props by surface kind

`InfectionNode.surfaceProps` is `Record<string, unknown>` in the schema because its
shape depends on `surface`. The fixture is the reference for every key; the planner
agent must produce the same keys.

| `surface` | keys |
| --- | --- |
| `document_diff` | `actions[]`, `paragraphContext`, `occurrences`, `warning?` |
| `field_change` | `actions[]`, `connectedOpportunities[]`, `verifiedBy` |
| `dependency_decision` | `actions[]`, `impactStatement`, `suggestedAssignee`, `suggestedUrgency` |
| `corrective_message` | `actions[]`, `recipients[]`, `sentAt`, `impactExplanation` |
| `preservation_notice` | `actions[]`, `reason`, `proposedNotice` |

## The three safeguards judges are told to look for

1. **Low-confidence match** → `n_techdoc`: `confidence: 0.62`, `requiresHumanReview: true`, `surfaceProps.warning`.
2. **External source unavailable** → `Evidence.sourceStatus: "cached"`, labelled as cached in the UI.
3. **Irreversible artefact** → `disposition: "irreversible"` never produces an edit action, only `corrective_message`.
