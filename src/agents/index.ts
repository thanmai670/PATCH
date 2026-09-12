/**
 * WORKSTREAM A. Six agents, each a pure typed function (ADR-0003).
 *
 * runPipeline calls them in sequence. Mastra (#8) wraps this; it owns no logic, so if
 * the graph fights us the fallback is exactly this function.
 */
import type { InfectionReport, AgentTraceEntry } from "@/contract";
import { interpreter, type SlackNomination } from "./interpreter";
import { evidence } from "./evidence";
import { tracer } from "./tracer";
import { classifier, type ClassifiedNode } from "./classifier";
import { planner } from "./planner";
import { executor } from "./executor";

export { interpreter, evidence, tracer, classifier, planner, executor };
export type { SlackNomination, ClassifiedNode };

export type ProgressFn = (t: AgentTraceEntry) => void;

export async function runPipeline(
  nomination: SlackNomination,
  onProgress?: ProgressFn,
): Promise<InfectionReport> {
  const trace: AgentTraceEntry[] = [];
  const emit = (t: AgentTraceEntry) => { trace.push(t); onProgress?.(t); };

  const { change, extras, trace: t1 } = await interpreter(nomination);
  emit(t1);

  // Evidence and spread are independent — run them together.
  const [ev, tr] = await Promise.all([evidence(change, extras), tracer(change)]);
  emit(ev.trace); emit(tr.trace);

  const cls = await classifier({ change, candidates: tr.candidates });
  emit(cls.trace);

  const pl = await planner({ change, nodes: cls.nodes });
  emit(pl.trace);

  // CONTEXT.md: infection status decides whether a node lights up. An immune
  // artefact was checked and does not carry the stale fact, so it is not part of
  // the spread and does not belong on the map. The count of everything examined
  // stays visible in the classifier's trace line, so nothing is hidden.
  const examined = pl.nodes.length;
  const nodes = pl.nodes.filter((n) => n.status !== "immune");
  const clean = examined - nodes.length;
  if (clean > 0) {
    const t = trace.find((x) => x.agent === "classifier");
    if (t) t.summary += `. ${clean} checked and clean (not shown)`;
  }

  return {
    reportId: `rpt_${change.id}`,
    change,
    evidence: ev.evidence,
    nodes,
    trace,
    summary: {
      safeToUpdate: nodes.filter((n) => n.disposition === "editable" && !n.requiresHumanReview).length,
      requiresReview: nodes.filter((n) => n.requiresHumanReview).length,
      alreadyCommunicated: nodes.filter((n) => n.disposition === "irreversible").length,
      preserveAsHistorical: nodes.filter((n) => n.disposition === "historical").length,
    },
    generatedAt: new Date().toISOString(),
  };
}
