import type { ArtefactKind, InfectionNode, TruthChange } from "@/contract";

/**
 * The contract speaks in field names. People do not. Everything a person reads on
 * screen is translated here, so the vocabulary stays consistent across the list, the
 * map and the repair panel — and so a non-technical reader never has to decode an
 * enum to understand what is in front of them.
 */

export const KIND_LABEL: Record<ArtefactKind, string> = {
  document: "Document",
  crm_record: "Customer record",
  task: "Job on someone's list",
  email_sent: "Email already sent",
  email_draft: "Unsent draft",
  historical_document: "Archived record",
};

export type Tone = "safe" | "care" | "sent" | "keep" | "done";

export const TONE_COLOR: Record<Tone, { dot: string; text: string }> = {
  safe: { dot: "rgb(var(--c-immune))", text: "text-immune-deep" },
  care: { dot: "rgb(var(--c-exposed))", text: "text-exposed-deep" },
  sent: { dot: "rgb(var(--c-irreversible))", text: "text-irreversible-deep" },
  keep: { dot: "rgb(var(--c-historical))", text: "text-historical-deep" },
  done: { dot: "rgb(var(--c-immune))", text: "text-immune-deep" },
};

/** What PATCH is allowed to do about this one, said plainly. */
export function plainStatus(node: InfectionNode): { label: string; tone: Tone } {
  if (node.disposition === "irreversible")
    return { label: "Someone already has it", tone: "sent" };
  if (node.disposition === "historical")
    return { label: "Must stay as it is", tone: "keep" };
  if (node.requiresHumanReview) return { label: "Your call", tone: "care" };
  return { label: "Safe to fix", tone: "safe" };
}

/** Why this thing is on the list at all. */
export function plainWhy(node: InfectionNode, change: TruthChange): string {
  if (node.status === "immune") return "Checked — it was already right";
  if (node.status === "exposed")
    return `Never says ${change.previousValue}, but was worked out from it`;
  return `Has ${change.previousValue} written in it`;
}

/** How much to trust the link PATCH drew between this thing and the change. */
export function plainMatch(node: InfectionNode): string {
  if (node.matchKind === "exact") return "Found the old figure written out";
  if (node.matchKind === "semantic") return "Matched on meaning, not wording";
  return "Worked out by the agent, not found in the text";
}

/**
 * Which decisions actually repair the artefact. Only these turn a node green — an
 * annotation, a corrective message and a review task all leave the artefact exactly
 * as it was, which is the whole point of ADR-0009's two refusing surfaces.
 */
export const REPAIR_DECISIONS = new Set(["accept", "rewrite"]);

/** Decisions that decline to act. They are recorded and never heal anything. */
export const REFUSALS = new Set(["except", "preserve_original"]);

/** What a recorded decision means, said the way the surface said it. */
export function plainOutcome(decision: string): string {
  switch (decision) {
    case "accept":
    case "rewrite":
      return "Repair approved";
    case "annotate":
      return "Note ready to attach";
    case "draft_correction":
      return "Correction ready to send";
    case "create_review":
      return "Review task queued";
    case "preserve_original":
      return "Left alone";
    case "except":
      return "Skipped";
    default:
      return "Decided";
  }
}

/** The one action offered, phrased as the thing that will happen. */
export function plainAction(node: InfectionNode): string {
  switch (node.surface) {
    case "document_diff":
      return "Swap the old figure for the new one";
    case "field_change":
      return "Update the field on the record";
    case "dependency_decision":
      return "Ask someone to check the knock-on work";
    case "corrective_message":
      return "Send a correction to the people who got it";
    case "preservation_notice":
      return "Attach a note, change nothing";
    default:
      return "Open it to decide";
  }
}
