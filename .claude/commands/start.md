---
description: Onboard onto PATCH and run the full workflow — setup, grill, ADRs, spec, tickets, implement.
---

# PATCH — start

You are onboarding a teammate onto the PATCH hackathon repo and then driving her
through the full engineering workflow. There are ~2 hours left. Be fast, do not
over-explain, and never leave her idle waiting on you.

Work through these phases **in order**. Do not skip ahead. Do not ask permission to
start each phase — just go, and report as you complete each one.

---

## Phase 0 — Setup (do this silently, report only the result)

Run these yourself. Do not ask her to run them.

1. Check whether the Matt Pocock skills are installed — look for
   `~/.agents/skills/grill-with-docs/SKILL.md` or `~/.claude/skills/grill-with-docs/SKILL.md`.
   If missing, run `npx skills@latest add mattpocock/skills`. If it needs interactive
   input, stop and tell her the exact command to run and what to select
   (**official** set, target **Claude Code**), then continue once she confirms.
2. Run `npm install` if `node_modules` is absent.
3. Ensure `.env.local` exists — `cp .env.example .env.local` if not. **Leave every key
   blank.** She does not need any key; the UI renders from the fixture.
4. Start the dev server in the background and confirm `http://localhost:3000` returns 200.
5. `git checkout -b workstream-b` if she is still on `main`.

Report: "Setup done — dev server on :3000, branch workstream-b."

## Phase 1 — Load context (read, do not summarise back at length)

Read all of these before saying anything substantive:

- `CONTEXT.md` — the glossary. Use these exact terms from here on.
- `src/contract/schema.ts` — **frozen**. The shapes she renders.
- `docs/ARCHITECTURE.md` — where her half sits.
- `docs/WORKSTREAM-B.md` — her task list, sizes, and priority order.
- `fixtures/atlas-infection.json` — the six nodes she builds against.
- `docs/adr/0001` through `0006` — settled decisions.

Then give her a **five-line** orientation: what she owns, what's already decided, what
the first task is, and the one hard rule (never edit `src/contract/schema.ts` alone).

## Phase 2 — Grill (`grill-with-docs`)

Read `~/.agents/skills/grill-with-docs/SKILL.md`, `~/.agents/skills/grilling/SKILL.md`
and `~/.agents/skills/domain-modeling/SKILL.md`, then follow them — grill her on **her
half only**.

Scope, strictly:
- Map layout, and how infection spread animates outward from the centre.
- How **infection status** and **repair disposition** are encoded visually as two
  separate axes without becoming noise (ADR-0001).
- How the five repair surfaces stay **structurally different** rather than one modal
  with different text. This is the thesis of the product — press hard here.
- How lasso multi-select behaves for nodes with `requiresHumanReview: true`.
- What the screen does when a repair fails, and what it does with no network.

Out of scope — **do not reopen**: the contract shape, the two-axis model, the agent
pipeline, the framework choices, ADRs 0001–0006. If she pushes into those, say they're
settled and point at the ADR.

Rules: one question at a time, each with your recommended answer. Look up facts in the
repo rather than asking. Time-box to about 10 minutes of her attention, then move on —
tell her you're moving on, don't silently stop.

Write any new decisions to `docs/adr/`, **numbered from 0007**. Update `CONTEXT.md` if
a genuinely new term appears; do not put implementation detail in it.

## Phase 3 — Spec (`to-spec`)

Read `~/.agents/skills/to-spec/SKILL.md` and follow it. No interview — synthesise the
grill. Publish as a GitHub issue in `thanmai670/PATCH` with labels
`ready-for-agent` and `workstream-b`. Use the glossary vocabulary throughout.

## Phase 4 — Tickets (`to-tickets`)

Read `~/.agents/skills/to-tickets/SKILL.md` and follow it.

**Issues #1–#5 already exist for Workstream B.** Reconcile with them — update or close
them as appropriate. Do **not** create near-duplicates. Any new tickets get
`workstream-b` and declare their blocking edges.

## Phase 5 — Implement (`implement`)

Read `~/.agents/skills/implement/SKILL.md` and follow it. Work in the priority order in
`docs/WORKSTREAM-B.md`: **B1 (#1, infection map) then B2 (#2, repair surfaces) are the demo.
B3–B5 are upside — do not start them until B1 and B2 both render.**

While implementing:
- Run `npx tsc --noEmit` regularly. Keep it clean.
- Commit to `workstream-b` after each ticket and push. **No Claude Code signature, no
  `Co-Authored-By` trailer** in any commit message.
- Verify in the browser, not just in the types. Screenshot when a surface lands.
- If you need a contract change, **stop** and post on issue #11. Do not edit
  `src/contract/schema.ts` unilaterally.

---

## Standing constraints

- Deadline is hard. At any point, prefer a working simpler thing over a broken better thing.
- The app must render with **no keys and no network**. Never break the fixture fallback.
- She owns `src/components/contagion/**`. Do not touch `src/agents/**`,
  `src/adapters/**`, or `src/app/api/**` — those belong to Workstream A.
