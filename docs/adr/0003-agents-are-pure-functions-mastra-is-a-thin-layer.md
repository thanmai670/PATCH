# The six agents are pure typed functions; Mastra orchestrates them as a thin layer

We chose Mastra for genuine multi-agent orchestration and its traces. But a graph
runtime is a poor thing to be debugging at minute 140 of a 180-minute hackathon. So
each agent (`interpreter`, `evidence`, `tracer`, `classifier`, `planner`, `executor`)
is written first as a plain `async` function with its own system prompt, OpenRouter
model, and Zod output schema. Mastra wires them together but owns no logic.

## Consequences

If Mastra fights us, the fallback is calling the six functions in sequence in
`runPipeline()` — about five minutes of work — and the multi-agent story survives
intact because the agents were always the real unit. Every agent is independently
testable without a graph.
