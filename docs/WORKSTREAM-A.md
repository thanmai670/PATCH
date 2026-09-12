# Workstream A — agents, evidence, workspace, Slack

**You own:** everything behind the contract. Issues **#6–#10**.

## Order, and why

| # | Task | ~min | Why here |
| --- | --- | --- | --- |
| #6 | Ambiguous adapter + seed | 35 | Nothing else can be tested until artefacts exist |
| #7 | Six agent functions | 50 | The actual product logic |
| #8 | Mastra graph | 25 | Thin layer; **15-min timebox then fall back** (ADR-0003) |
| #9 | Slack 🩹 trigger | 40 | Spike transport in the first 10 min |
| #10 | API routes | 20 | Unblocks B's approve button |

## Two landmines, already found

1. **`onReaction("adhesive_bandage", …)` will not fire.** Only eight portable emoji
   names are accepted. Use the unfiltered handler and match `rawEmoji`. ADR-0004.
2. **Managed Slack has no slash commands.** `/patch this` arrives as plain text.
   Triggers are the 🩹 reaction and an `@PATCH` mention. ADR-0004.

## The agent that actually matters

The **classifier** is where the product lives. Two calls carry the whole pitch:

- Sent customer email → `infected` + **`irreversible`** → never an edit action, only a
  corrective message.
- Orion 2024 as-built → `infected` + **`historical`** → annotate, never edit.

If the classifier gets those right and everything else is mediocre, the demo lands. If
it flattens them into "just replace the string", the demo is a find-and-replace tool.
Put your strongest model here and write the system prompt against ADR-0001.

## Spike first, build second

In your first 10 minutes, prove two things independently of everything else:

```bash
curl -s -H "Authorization: Bearer $AMBIGUOUS_API_KEY" \
  https://app.ambiguous.ai/api/documents | head
```

and that a 🩹 reaction in `#project-atlas` reaches your handler at all. Both are
external dependencies you cannot fix at minute 160.

## Don't cross the line

You own `src/agents/**`, `src/adapters/**`, `src/app/api/**`, `scripts/**`.
She owns `src/components/contagion/**`. `src/contract/schema.ts` changes only via #11.
