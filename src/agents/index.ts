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

export async function runPipeline(nomination: SlackNomination): Promise<InfectionReport> {
  const trace: AgentTraceEntry[] = [];

  const { change, trace: t1 } = await interpreter(nomination);
  trace.push(t1);

  // Evidence and spread are independent — run them together.
  const [ev, tr] = await Promise.all([evidence(change), tracer(change)]);
  trace.push(ev.trace, tr.trace);

  const cls = await classifier({ change, candidates: tr.candidates });
  trace.push(cls.trace);

  const pl = await planner({ change, nodes: cls.nodes });
  trace.push(pl.trace);

  const nodes = pl.nodes;
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
