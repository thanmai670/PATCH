# Start here

You own **Workstream B — the Contagion View**. It is the hero of the demo.

Total setup: about 4 minutes. Then you are building, not waiting.

---

## 1. Install the skills (2 min, in any terminal)

```bash
npx skills@latest add mattpocock/skills
```

Pick the **official** set (not "other"/experiments) and select **Claude Code** as the
target agent. This gives you `/grill-with-docs`, `/to-spec`, `/to-tickets`,
`/implement`, `/tdd`, `/code-review`, `/ask-matt`.

## 2. Clone and run (2 min)

```bash
git clone https://github.com/thanmai670/PATCH.git
cd PATCH
npm install
cp .env.example .env.local     # leave every key blank — you don't need any
npm run dev                    # http://localhost:3000
```

You should see the Contagion View header rendering the 22 kW → 18.5 kW change with the
six-node summary. The map and repair surfaces are stubs — that's your work.

**You never need an API key and you never need to wait for the agent pipeline.**
The app renders from `fixtures/atlas-infection.json` (ADR-0002).

## 3. Point Claude Code at the repo config

The repo already carries the skill configuration — issue tracker (GitHub Issues in
`thanmai670/PATCH`), triage labels, and domain-doc rules are committed in
`AGENTS.md` + `docs/agents/`. Claude Code picks these up automatically when you open
the repo. **Do not** run `/setup-matt-pocock-skills` — it's already done, and re-running
it would just rewrite the same files.

---

## 4. Your workflow

Open Claude Code in the `PATCH` directory and run these in order.

### a. `/grill-with-docs`

Paste this as the subject:

> I own the Contagion View in PATCH — the interactive infection map plus the five
> generated repair surfaces. Read CONTEXT.md, src/contract/schema.ts, docs/ARCHITECTURE.md,
> docs/WORKSTREAM-B.md and fixtures/atlas-infection.json first. The contract and the
> six ADRs are already settled — do not reopen them. Grill me only on the UI design
> decisions inside my half: map layout and how infection spread is animated, how the
> two axes (status and disposition) are encoded visually without being confusing, how
> the five repair surfaces stay structurally distinct rather than one modal with
> different text, how lasso multi-select interacts with nodes that require human
> review, and what the screen does when a repair fails. I have roughly 2 hours.

It will write any new decisions into `docs/adr/` as ADR-0007 onward. **Start numbering
at 0007** — 0001–0006 are taken.

### b. `/to-spec`

No arguments. It synthesises the grill into a spec and publishes it as a GitHub issue
with the `ready-for-agent` label. It does not re-interview you.

### c. `/to-tickets`

No arguments. It breaks the spec into vertical-slice tickets with blocking edges, as
GitHub issues. Issues **#1–#5** already exist for your half — tell it to reconcile
with those rather than duplicating them.

### d. `/implement`

Work ticket by ticket. Priority order is in `docs/WORKSTREAM-B.md` — **B1 (infection
map) and B2 (repair surfaces) are the demo. B3–B5 are upside.**

---

## The one hard rule

**Do not edit `src/contract/schema.ts` by yourself.** It is the seam between your half
and the agent half; a unilateral change silently breaks the other side with no error.
If you need a field, say so in the integration issue (#11) and we change it together.

## Branch and push

```bash
git checkout -b workstream-b
# ... commit as you go ...
git push -u origin workstream-b
```

Push early and often — merge conflicts at minute 170 are how hackathons die. You own
`src/components/contagion/**`; nothing else should be touched by both of us.

## If you're stuck on what to do next

`/ask-matt` routes you to the right skill. Or just read
[`docs/WORKSTREAM-B.md`](WORKSTREAM-B.md) — it has the task list, sizes, and the exact
fixture node backing each repair surface.
