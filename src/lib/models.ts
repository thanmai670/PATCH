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

/**
 * Runtime overrides, so a model can be chosen from Slack without an edit and a
 * restart. Written by the `@patch models` picker; absent file means defaults.
 * Read per call rather than cached, so a change takes effect on the next run.
 */
const OVERRIDE_PATH = ".patch-models.json";

export function readOverrides(): Partial<Record<AgentName, string>> {
  try {
    // Node-only; the UI never calls this.
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    return JSON.parse(readFileSync(OVERRIDE_PATH, "utf8"));
  } catch {
    return {};
  }
}

export function resolveModel(agent: AgentName): string {
  return readOverrides()[agent] ?? AGENT_MODELS[agent];
}
