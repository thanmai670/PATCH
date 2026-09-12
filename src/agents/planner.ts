import { z } from "zod";
import { runAgent } from "@/lib/openrouter";
import type { TruthChange, InfectionNode, AgentTraceEntry } from "@/contract";
import type { ClassifiedNode } from "./classifier";

const Out = z.object({
  surfaces: z.array(
    z.object({
      id: z.string(),
      surface: z.enum([
        "document_diff", "field_change", "dependency_decision",
        "corrective_message", "preservation_notice",
      ]),
      actions: z.array(z.string()),
      // union of every surface's optional props; only the relevant ones are filled
      paragraphContext: z.string().nullable().optional(),
      occurrences: z.number().nullable().optional(),
      warning: z.string().nullable().optional(),
      connectedOpportunities: z.array(z.string()).nullable().optional(),
      verifiedBy: z.string().nullable().optional(),
      impactStatement: z.string().nullable().optional(),
      suggestedAssignee: z.string().nullable().optional(),
      suggestedUrgency: z.string().nullable().optional(),
      recipients: z.array(z.string()).nullable().optional(),
      sentAt: z.string().nullable().optional(),
      impactExplanation: z.string().nullable().optional(),
      reason: z.string().nullable().optional(),
      proposedNotice: z.string().nullable().optional(),
    }),
  ),
});

const SYSTEM = `You choose the REPAIR SURFACE for each classified artefact, and its props.

The surface follows from disposition and kind. This mapping is not negotiable:

  disposition=irreversible              -> corrective_message
  disposition=historical                -> preservation_notice
  kind=crm_record, disposition=editable -> field_change
  status=exposed                        -> dependency_decision
  otherwise (editable prose)            -> document_diff

Never offer an edit action on an irreversible or historical artefact. corrective_message
drafts a NEW message; preservation_notice adds a NOTE. Both leave the original untouched.
That refusal is the product, not a limitation.

Props per surface — fill only these, leave the rest null:
  document_diff       : actions [accept, rewrite, except], paragraphContext, occurrences, warning (only if low confidence)
  field_change        : actions [accept, except], connectedOpportunities, verifiedBy
  dependency_decision : actions [create_review, assign_engineer, preserve_original, set_urgency], impactStatement, suggestedAssignee, suggestedUrgency
  corrective_message  : actions [draft_correction, except], recipients, sentAt, impactExplanation
  preservation_notice : actions [annotate, except], reason, proposedNotice

impactStatement, impactExplanation, reason and proposedNotice are read by a human on
screen. Write them as specific sentences about THIS artefact, not generic filler.

Return ONLY JSON: {surfaces: [{id, surface, actions, ...props}]}. One per node.`;

export async function planner(args: {
  change: TruthChange;
  nodes: ClassifiedNode[];
}): Promise<{ nodes: InfectionNode[]; trace: AgentTraceEntry }> {
  const user = [
    `Change: ${args.change.subject} — ${args.change.previousValue} → ${args.change.newValue}`,
    "",
    "Classified artefacts:",
    ...args.nodes.map(
      (n) =>
        `- id=${n.id} kind=${n.kind} status=${n.status} disposition=${n.disposition} confidence=${n.confidence} review=${n.requiresHumanReview}\n  title: ${n.title}\n  rationale: ${n.rationale}` +
        (n.excerpt ? `\n  excerpt: "${n.excerpt.before}" -> "${n.excerpt.after}"${n.excerpt.field ? ` (field ${n.excerpt.field})` : ""}` : ""),
    ),
  ].join("\n");

  const { data, trace } = await runAgent({
    agent: "planner",
    system: SYSTEM,
    user,
    schema: Out,
    summarise: (d) =>
      `Generated ${new Set(d.surfaces.map((s) => s.surface)).size} distinct repair surface type(s) across ${d.surfaces.length} artefact(s)`,
  });

  const bySurface = new Map(data.surfaces.map((s) => [s.id, s]));

  const nodes: InfectionNode[] = args.nodes.map((n) => {
    const s = bySurface.get(n.id);
    // Fall back to the deterministic mapping if the model omitted a node.
    const surface: InfectionNode["surface"] =
      s?.surface ??
      (n.disposition === "irreversible"
        ? "corrective_message"
        : n.disposition === "historical"
          ? "preservation_notice"
          : n.kind === "crm_record"
            ? "field_change"
            : n.status === "exposed"
              ? "dependency_decision"
              : "document_diff");

    const props: Record<string, unknown> = { actions: s?.actions ?? [] };
    for (const [k, v] of Object.entries(s ?? {})) {
      if (k === "id" || k === "surface" || k === "actions") continue;
      if (v !== null && v !== undefined) props[k] = v;
    }
    if (n.requiresHumanReview && surface === "document_diff" && !props.warning) {
      props.warning = `Confidence ${Math.round(n.confidence * 100)}%. Human review required before any write.`;
    }

    return { ...n, surface, surfaceProps: props };
  });

  return { nodes, trace };
}
