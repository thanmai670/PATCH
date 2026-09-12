# PATCH

**When truth changes, patch everywhere it spread.**

Every organisation has one source of truth and hundreds of copies of yesterday's truth.
The dangerous part isn't that a fact changed — it's that the old fact is still alive in
a draft proposal, a CRM record, an open task, and an email you already sent.

PATCH detects a truth change where it actually happens (a Slack message someone reacts
to with 🩹), finds everywhere the old value spread, and **generates a different repair
interface for every affected item** — because repairing a draft, a CRM field, a
dependent engineering task, an already-sent customer email, and a historical as-built
record are five different problems.

*Codependents presents PATCH. React 🩹 when reality changes.*

**Docs and overview: [patch-agent-zeta.vercel.app](https://patch-agent-zeta.vercel.app)** — source in [`site/`](site/).

---

## Quickstart

```bash
git clone https://github.com/thanmai670/PATCH.git && cd PATCH
claude          # then type:  /start
```

`/start` installs the skills, installs deps, boots the dev server, loads the domain
context, and drives the grill → ADRs → spec → tickets → implement flow. One command.

Manual equivalent:

```bash
npm install && cp .env.example .env.local && npm run dev   # http://localhost:3000
```

The UI boots against `fixtures/atlas-infection.json` and renders fully **with no API
keys and no network**. That is deliberate (ADR-0002) — it's also the demo fallback.

## Who does what

| | Owner | Doc |
| --- | --- | --- |
| **A** — agents, Exa, Ambiguous, Slack | Thanmai | [`docs/WORKSTREAM-A.md`](docs/WORKSTREAM-A.md) |
| **B** — Contagion View, repair surfaces | teammate | [`docs/WORKSTREAM-B.md`](docs/WORKSTREAM-B.md) · **[start here](docs/TEAMMATE-START-HERE.md)** |

The seam between you is [`src/contract/schema.ts`](src/contract/schema.ts). **Neither
person edits it alone.**

## Read before writing code

- [`CONTEXT.md`](CONTEXT.md) — the vocabulary. Use it in code, issues, UI, and on stage.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the six agents and how they connect.
- [`docs/adr/`](docs/adr/) — six decisions and why. ADR-0001 and ADR-0004 will save you an hour each.
- [`docs/DEMO-RUNBOOK.md`](docs/DEMO-RUNBOOK.md) — the 90-second script and the fallbacks.

## Stack

Next.js 15 · TypeScript · CopilotKit (generative UI + Channels/Slack) · Mastra
(agent graph) · OpenRouter (all model calls) · Exa (external evidence) · Ambiguous
(the workspace that actually gets written to).

## The scenario

Supplier revises the Project Atlas drive motor from **22 kW → 18.5 kW**. Six workspace
artefacts carry the old value. Two are safe to update, one needs an engineering review,
one already went to the customer, one is a historical record that must not be touched,
and one is a low-confidence match that might be a different motor entirely.

Knowing the difference is the product.
