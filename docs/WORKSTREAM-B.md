# Workstream B — Contagion View (generative repair UI)

**You own:** everything a judge looks at. This is the hero of the demo (ADR-0002).

**You do not need Workstream A to finish, ever.** The app boots against
`fixtures/atlas-infection.json`, a complete realistic `InfectionReport`. Run it:

```bash
git clone https://github.com/thanmai670/PATCH.git && cd PATCH
npm install
cp .env.example .env.local     # you can leave every key blank
npm run dev                    # http://localhost:3000  ← fixture renders immediately
```

`?fixture=0` switches to live agent output once A's pipeline is up. Default is fixture.

---

## Read first (5 min, not optional)

1. `CONTEXT.md` — the vocabulary. Use these words in the UI, not synonyms.
2. `src/contract/schema.ts` — **the shapes you render.** This is frozen.
3. `docs/adr/0001-...` — why status and disposition are two separate fields.

## The one rule

**Do not edit `src/contract/schema.ts` alone.** It's the seam between us; a unilateral
change silently breaks the agent side. Need a field? Say so in the integration issue
and we change it together.

---

## Tasks, in the order that protects the demo

### B1 — Infection map (`InfectionMap.tsx`) · ~45 min · **do this first**
Radial layout: `report.change` at centre, one node per `report.nodes[]` around it.
- Colour by **`status`**: `infected` red, `exposed` amber, `immune` green.
- Border/badge by **`disposition`**: `historical` violet, `irreversible` pink, `editable` plain.
  These are two different fields — see ADR-0001. Do not collapse them.
- Draw edges from `dependsOn`. Animate infection travelling outward from centre on mount —
  this is the 10-second moment judges remember.
- `matchKind` gets a small glyph: `exact` solid, `semantic` dashed, `inferred` dotted.
- `reactflow` is installed if you want it; hand-rolled SVG is honestly fine and faster.

### B2 — Repair surfaces (`RepairSurface.tsx`) · ~60 min · **the actual thesis**
Switch on `node.surface` and render a **structurally different** control for each.
Five surfaces, all present in the fixture so you can build every one without agents:

| `node.surface` | Fixture node | Must render |
| --- | --- | --- |
| `document_diff` | `n_proposal`, `n_techdoc` | before/after text diff · accept · rewrite · mark exception |
| `field_change` | `n_crm` | current → verified value · source badge · connected opportunities · update |
| `dependency_decision` | `n_task` | impact statement · create review task · assign · preserve original · urgency |
| `corrective_message` | `n_email_sent` | "cannot be repaired silently" · draft correction · recipients · send for approval |
| `preservation_notice` | `n_historical` | "preserve as historical" · proposed annotation · annotate only |

Per-surface props are in `node.surfaceProps` — the fixture shows the exact keys for each.
If two surfaces look like the same modal with different text, the thesis is dead. Make
`corrective_message` and `preservation_notice` visibly *refuse* to do the normal thing.

`n_techdoc` carries `surfaceProps.warning` (low-confidence "may be a different 22 kW
motor") and `n_task` has `requiresHumanReview: true` — render both distinctly. These
are two of the three safeguards judges are told to look for.

### B3 — Evidence rail (`EvidenceRail.tsx`) · ~20 min
Render `report.evidence[]` with a source badge from `sourceStatus`:
`live` green · `cached` amber ("cached — source unreachable") · `unverified` grey.
`supports: false` = a **contradicting** source. Show it, don't hide it — `ev_catalogue`
in the fixture is one.

### B4 — Lasso + approve (`ContagionView.tsx`) · ~30 min
Multi-select safe nodes (`disposition === "editable" && !requiresHumanReview`), approve
them as one batch. Build a `RepairPlan` (see contract) and `POST /api/repair`.
A's route may 501 at first — that's fine, show the optimistic green-heal animation and
log the payload.

### B5 — Heal animation · ~15 min · only if B1–B4 are done
Nodes turn green as `ExecutionResult`s come back.

---

## Demo-safety rules

- **Never** let a failed fetch blank the screen. `loadReport` already falls back to the
  fixture; keep it that way.
- Build at 1440×900 and check it doesn't scroll horizontally.
- Dark background is already set in `globals.css`.

## Definition of done for your half

Open `http://localhost:3000`, click all six nodes, see five structurally different
repair surfaces, lasso the two safe ones, hit approve, watch them go green — **with the
network cable unplugged.**
