/**
 * WORKSTREAM A OWNS THIS DIRECTORY.
 *
 * Six agents, each a pure typed function (ADR-0003). Mastra wires them together but
 * owns no logic — if the graph fights you for 15 minutes, call these in sequence in
 * runPipeline() instead. The multi-agent story survives either way.
 *
 * Model per agent comes from src/lib/models.ts. Every agent returns an AgentTraceEntry
 * recording the model that actually ran — the trace panel shows it on stage.
 */
import type {
  TruthChange, Evidence, InfectionNode, InfectionReport,
  RepairPlan, ExecutionReport, AgentTraceEntry,
} from "@/contract";

export type SlackNomination = {
  channel: string;
  messageTs: string;
  text: string;
  threadText: string[];
  author: string;
  attachments: { name: string; url: string }[];
};

/** Classifier output before the planner attaches a repair surface. */
export type ClassifiedNode = Omit<InfectionNode, "surface" | "surfaceProps">;

const todo = (name: string): never => {
  throw new Error(`agent "${name}" not implemented — see docs/WORKSTREAM-A.md`);
};

/** 1. Slack message + thread → the proposed truth change. Issue #7. */
export async function interpreter(
  input: SlackNomination,
): Promise<{ change: TruthChange; trace: AgentTraceEntry }> {
  return todo("interpreter");
}

/** 2. Exa search_and_contents → evidence with live/cached/unverified status. Issue #7. */
export async function evidence(
  change: TruthChange,
): Promise<{ evidence: Evidence[]; trace: AgentTraceEntry }> {
  return todo("evidence");
}

/** 3. Ambiguous POST /search → candidate artefacts carrying the stale fact. Issue #7. */
export async function tracer(
  change: TruthChange,
): Promise<{ candidates: unknown[]; trace: AgentTraceEntry }> {
  return todo("tracer");
}

/**
 * 4. The agent that carries the product. Per artefact, emit BOTH axes (ADR-0001):
 *    status (infected | exposed | immune) AND disposition (editable | historical | irreversible).
 *
 *    A sent customer email is infected + irreversible.
 *    A 2024 as-built document is infected + historical.
 *
 *    Get those two right and the demo lands. Flatten them into "replace the string"
 *    and this is a find-and-replace tool. Issue #7.
 */
export async function classifier(args: {
  change: TruthChange;
  candidates: unknown[];
}): Promise<{ nodes: ClassifiedNode[]; trace: AgentTraceEntry }> {
  return todo("classifier");
}

/** 5. Choose repair surface + props from kind × disposition. Keys in docs/ARCHITECTURE.md. Issue #7. */
export async function planner(args: {
  change: TruthChange;
  nodes: ClassifiedNode[];
}): Promise<{ nodes: InfectionNode[]; trace: AgentTraceEntry }> {
  return todo("planner");
}

/** 6. Approved plan → real Ambiguous writes → audit. Issue #7. */
export async function executor(plan: RepairPlan): Promise<ExecutionReport> {
  return todo("executor");
}

/** The whole pipeline. Mastra calls this, or it calls the six directly. */
export async function runPipeline(nomination: SlackNomination): Promise<InfectionReport> {
  return todo("runPipeline");
}
