# All model calls go through OpenRouter, with a per-agent model map

We have OpenRouter credits, so every agent calls OpenRouter rather than a provider SDK
directly. Model choice is a per-agent constant in `src/lib/models.ts`, not a global
default.

## Consequences

We can put a cheap fast model on extraction-shaped work (`evidence`, `tracer`) and a
stronger model on the judgement-shaped work (`classifier`, `planner`) where the
historical/irreversible distinction is actually decided — and re-tune that map from one
file if we run slow or run out of credit. One `OPENROUTER_API_KEY` is the only model
secret in `.env`.

The model id used for each call is recorded in `AgentTraceEntry.model` and shown in the
trace panel, so what ran is visible on stage rather than claimed.
