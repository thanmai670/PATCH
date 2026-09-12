"use client";

import { useState } from "react";
import type { InfectionNode, TruthChange } from "@/contract";
import { Action, Marked, Provenance, ReviewBanner } from "../atoms";
import { actions, num, optional, str } from "../surfaceProps";

/**
 * Editable prose containing the stale literal. The shape of this surface is a
 * before/after diff, because the thing being repaired is a sentence.
 */
export function DocumentDiffSurface({
  node,
  change,
  onDecide,
}: {
  node: InfectionNode;
  change: TruthChange;
  onDecide: (decision: string, payload?: Record<string, unknown>) => void;
}) {
  const p = node.surfaceProps;
  const warning = optional(p, "warning");
  const available = actions(p);
  const occurrences = num(p, "occurrences", 1);

  const [draft, setDraft] = useState(node.excerpt?.after ?? "");
  const [rewriting, setRewriting] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);

  return (
    <div className="px-6 py-6">
      {warning && (
        <div className="mb-4 rounded-lg border border-exposed/45 bg-exposed/[0.09] p-3.5">
          <p className="text-[13px] font-semibold text-exposed-deep">PATCH is not sure about this one</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{warning}</p>
        </div>
      )}
      {node.requiresHumanReview && !warning && <ReviewBanner change={change} />}

      <p className="text-[12.5px] text-ink-3">Editable document</p>
      <h2 className="mt-1 text-[17px] font-semibold leading-snug text-ink">{node.title}</h2>
      <p className="mt-1 text-[12.5px] text-ink-3">
        {str(p, "paragraphContext", "Body text")} ·{" "}
        {occurrences === 1 ? "1 occurrence" : `${occurrences} occurrences`} of{" "}
        {change.previousValue}
      </p>

      <div className="mt-4 space-y-2">
        <div className="rounded-lg border border-rule bg-sunk/60 p-3.5">
          <p className="mb-1.5 text-[12px] font-medium text-ink-3">
            Current
          </p>
          <p className="text-[13.5px] leading-relaxed text-ink">
            <Marked
              text={node.excerpt?.before ?? "—"}
              needle={change.previousValue}
              tone="stale"
            />
          </p>
        </div>

        <div className="rounded-lg border border-immune/35 bg-immune/[0.07] p-3.5">
          <p className="mb-1.5 text-[12px] font-medium text-ink-3">
            Proposed
          </p>
          {rewriting ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-md border border-rule bg-surface p-2.5 text-[13.5px] leading-relaxed text-ink outline-none focus:border-ink"
            />
          ) : (
            <p className="text-[13.5px] leading-relaxed text-ink">
              <Marked text={draft} needle={change.newValue} tone="fresh" />
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {available.includes("accept") && (
          <Action
            variant="primary"
            active={decision === "accept"}
            onClick={() => {
              setRewriting(false);
              setDecision("accept");
              onDecide("accept", { text: draft });
            }}
          >
            Use the new wording
          </Action>
        )}
        {available.includes("rewrite") && (
          <Action
            active={rewriting}
            onClick={() => {
              setRewriting((r) => !r);
              setDecision(null);
            }}
          >
            {rewriting ? "Done" : "Rewrite"}
          </Action>
        )}
        {available.includes("except") && (
          <Action
            variant="quiet"
            active={decision === "except"}
            onClick={() => {
              setDecision("except");
              onDecide("except");
            }}
          >
            Skip this one
          </Action>
        )}
      </div>

      {decision && (
        <p className="mt-3 text-[12.5px] text-immune-deep">
          {decision === "accept"
            ? "Ready to apply."
            : "Skipped. Nothing will change here."}
        </p>
      )}

      <Provenance node={node} />
    </div>
  );
}
