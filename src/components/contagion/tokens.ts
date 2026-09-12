import type { InfectionStatus, RepairDisposition, MatchKind } from "@/contract";

/**
 * The two-axis visual encoding (ADR-0008, upholding ADR-0001).
 *
 * Status is the artefact's FILL. Disposition is a RING, drawn only when we are not
 * free to edit — `editable` deliberately draws nothing, so the constrained ones stand
 * out. `fill` is tuned to read on paper; `deep` is the same meaning set as text.
 */

export const STATUS_COLOR: Record<InfectionStatus, string> = {
  infected: "#E0413F",
  exposed: "#E08A11",
  immune: "#0E9F6E",
};

export const STATUS_DEEP: Record<InfectionStatus, string> = {
  infected: "#B02020",
  exposed: "#9A5B06",
  immune: "#06724E",
};

export const STATUS_LABEL: Record<InfectionStatus, string> = {
  infected: "carries the old value",
  exposed: "depends on it",
  immune: "checked, still correct",
};

/** null = editable, which draws no ring at all. Absence is the signal. */
export const DISPOSITION_RING: Record<RepairDisposition, string | null> = {
  editable: null,
  historical: "#7C4DDB",
  irreversible: "#DB3C8A",
};

export const DISPOSITION_LABEL: Record<RepairDisposition, string> = {
  editable: "safe to edit",
  historical: "keep as a record",
  irreversible: "already sent out",
};

/** Trust lives on the EDGE, never on the artefact. */
export const MATCH_DASH: Record<MatchKind, string | undefined> = {
  exact: undefined,
  semantic: "7 5",
  inferred: "2 6",
};

export const MATCH_LABEL: Record<MatchKind, string> = {
  exact: "found the old value written out",
  semantic: "matched on meaning, not wording",
  inferred: "worked out by the agent",
};

export const REVIEW_COLOR = "#E08A11";
export const HEALED_COLOR = "#0E9F6E";
export const RULE_COLOR = "#D8DEE5";

/** An artefact is in the Safe Set when it needs no individual human judgement. */
export function isSafe(node: {
  disposition: RepairDisposition;
  requiresHumanReview: boolean;
}): boolean {
  return node.disposition === "editable" && !node.requiresHumanReview;
}
