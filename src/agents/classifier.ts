import { z } from "zod";
import { runAgent } from "@/lib/openrouter";
import type { TruthChange, InfectionNode, AgentTraceEntry } from "@/contract";
import type { Candidate } from "./tracer";

export type ClassifiedNode = Omit<InfectionNode, "surface" | "surfaceProps">;

const Out = z.object({
  nodes: z.array(
    z.object({
      ambiguousId: z.string(),
      kind: z.enum(["document", "crm_record", "task", "email_sent", "email_draft", "historical_document"]),
      status: z.enum(["infected", "exposed", "immune"]),
      disposition: z.enum(["editable", "historical", "irreversible"]),
      matchKind: z.enum(["exact", "semantic", "inferred"]),
      confidence: z.number().min(0).max(1),
      rationale: z.string(),
      requiresHumanReview: z.boolean(),
      excerptBefore: z.string().nullable(),
      excerptAfter: z.string().nullable(),
      excerptField: z.string().nullable(),
      dependsOn: z.array(z.string()),
    }),
  ),
});

/**
 * The agent that carries the product. Both axes, independently (ADR-0001).
 */
const SYSTEM = `You classify workspace artefacts against a changed fact, on TWO INDEPENDENT AXES.

AXIS 1 — status: does this artefact carry the stale fact?
  infected : contains the PREVIOUS value literally
  exposed  : depends on the fact but does NOT contain it literally (e.g. a cable schedule
             sized from a motor rating that is never quoted)
  immune   : does not carry the stale fact at all

STATUS IS ABOUT PRESENCE, NOT CORRECTNESS. If the artefact contains the previous value
literally, it is INFECTED — even when that value was correct at the time it was written.
A 2024 as-built record containing the old value is infected AND historical: infected
because the stale literal is in there, historical because we must not edit it. Do not use
immune to mean "it was right back then" — that is what disposition=historical expresses.

AXIS 2 — disposition: what are we PERMITTED to do about it?
  editable     : an internal, unissued artefact; safe to modify in place
  historical   : it was accurate when written and records what actually happened
                 (an as-built record, a delivered project's documentation, a signed
                 document). Preserve and annotate. NEVER edit.
  irreversible : already sent, published or delivered to someone outside the edit
                 boundary (a sent email, a published bulletin). History cannot be
                 rewritten silently; it needs a corrective action instead.

THE AXES ARE INDEPENDENT. A sent customer email is infected AND irreversible. A 2024
as-built document is infected AND historical. Never collapse them.

matchKind: exact (literal string hit) | semantic (meaning only) | inferred (your reasoning
only — the lowest trust, and it must be shown as such).

requiresHumanReview: true when confidence is below about 0.8, when the artefact may refer
to a DIFFERENT thing that merely shares the value, or when changing it could invalidate
dependent work. Being cautious here is correct; a silent wrong write is the worst outcome.

rationale: one or two sentences, written for a human to read on screen. Say what you saw
and why it landed where it did.

excerptBefore/excerptAfter: the stale text and its corrected form, when there is a literal
hit. null for exposed artefacts. excerptField: the field name for CRM records, else null.

dependsOn: ambiguousIds of other listed artefacts this one derives from. [] if none.

Return ONLY JSON: {nodes: [...]}. One entry per candidate. Do not invent candidates.`;

export async function classifier(args: {
  change: TruthChange;
  candidates: Candidate[];
}): Promise<{ nodes: ClassifiedNode[]; trace: AgentTraceEntry }> {
  const user = [
    `Changed fact: ${args.change.subject}`,
    `Previous value: ${args.change.previousValue}`,
    `New value: ${args.change.newValue}`,
    args.change.project ? `Project: ${args.change.project}` : "",
    "",
    "Candidate artefacts:",
    ...args.candidates.map(
      (c) =>
        `- id=${c.ambiguousId} module=${c.module} foundBy=${c.foundBy}\n  title: ${c.title}\n  snippet: ${c.snippet.slice(0, 400)}`,
    ),
  ].filter(Boolean).join("\n");

  const { data, trace } = await runAgent({
    agent: "classifier",
    system: SYSTEM,
    user,
    schema: Out,
    summarise: (d) => {
      const n = (p: (x: (typeof d.nodes)[number]) => boolean) => d.nodes.filter(p).length;
      return `Classified ${d.nodes.length}: ${n((x) => x.disposition === "editable")} editable, ${n((x) => x.disposition === "historical")} historical, ${n((x) => x.disposition === "irreversible")} irreversible, ${n((x) => x.status === "exposed")} exposed. ${n((x) => x.requiresHumanReview)} flagged for human review`;
    },
  });

  const byId = new Map(args.candidates.map((c) => [c.ambiguousId, c]));
  const nodes: ClassifiedNode[] = data.nodes.map((n) => {
    const c = byId.get(n.ambiguousId);
    // CONTEXT.md defines infected as "contains the stale literal". A literal search hit
    // proves it does, so status is not the model's call here. Models reliably drift to
    // "immune" for a historical artefact, meaning "it was right at the time" — which is
    // what disposition=historical already says. Disposition stays the model's judgement.
    const status = c?.foundBy === "search" && n.status === "immune" ? "infected" : n.status;
    return {
      id: `n_${n.ambiguousId.slice(0, 8)}`,
      ambiguousId: n.ambiguousId,
      kind: n.kind,
      title: c?.title ?? n.ambiguousId,
      href: `https://app.ambiguous.ai/${n.kind === "crm_record" ? "crm/deals" : n.kind.startsWith("email") ? "mail" : n.kind === "task" ? "tasks" : "documents"}/${n.ambiguousId}`,
      status,
      disposition: n.disposition,
      matchKind: n.matchKind,
      confidence: n.confidence,
      rationale: n.rationale,
      excerpt:
        n.excerptBefore === null
          ? null
          : { before: n.excerptBefore, after: n.excerptAfter ?? "", field: n.excerptField },
      dependsOn: n.dependsOn.map((d) => `n_${d.slice(0, 8)}`),
      requiresHumanReview: n.requiresHumanReview,
    };
  });

  return { nodes, trace };
}
