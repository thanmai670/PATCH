import type { InfectionStatus, RepairDisposition, MatchKind } from "@/contract";

/**
 * The two-axis visual encoding (ADR-0008, upholding ADR-0001).
 *
 * Status is the node's FILL. Disposition is a RING, drawn only when we are not free
 * to edit — `editable` deliberately draws nothing, so the constrained nodes stand out.
 */

export const STATUS_COLOR: Record<InfectionStatus, string> = {
  infected: "#ef4444",
  exposed: "#f59e0b",
  immune: "#10b981",
};

export const STATUS_LABEL: Record<InfectionStatus, string> = {
  infected: "Infected",
  exposed: "Exposed",
  immune: "Immune",
};

/** null = editable, which draws no ring at all. Absence is the signal. */
export const DISPOSITION_RING: Record<RepairDisposition, string | null> = {
  editable: null,
  historical: "#8b5cf6",
  irreversible: "#ec4899",
};

export const DISPOSITION_LABEL: Record<RepairDisposition, string> = {
  editable: "Editable",
  historical: "Historical — preserve",
  irreversible: "Irreversible — already sent",
};

/** Trust lives on the EDGE, never on the node. */
export const MATCH_DASH: Record<MatchKind, string | undefined> = {
  exact: undefined,
  semantic: "7 5",
  inferred: "2 6",
};

export const MATCH_LABEL: Record<MatchKind, string> = {
  exact: "Exact — literal match",
  semantic: "Semantic — meaning match",
  inferred: "Inferred — agent reasoning",
};

export const REVIEW_COLOR = "#fbbf24";
export const HEALED_COLOR = "#10b981";

/** A repair is in the Safe Set when it needs no individual human judgement. */
export function isSafe(node: {
  disposition: RepairDisposition;
  requiresHumanReview: boolean;
}): boolean {
  return node.disposition === "editable" && !node.requiresHumanReview;
}
