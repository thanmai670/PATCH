/**
 * Per-agent model routing through OpenRouter. See ADR-0005.
 * Cheap+fast for extraction, stronger for judgement. Re-tune here if you run slow.
 */
export const AGENT_MODELS = {
  interpreter: "anthropic/claude-sonnet-4.5",
  evidence:    "openai/gpt-4o-mini",
  tracer:      "openai/gpt-4o-mini",
  classifier:  "anthropic/claude-sonnet-4.5",
  planner:     "anthropic/claude-sonnet-4.5",
  executor:    "openai/gpt-4o-mini",
} as const;

export type AgentName = keyof typeof AGENT_MODELS;
