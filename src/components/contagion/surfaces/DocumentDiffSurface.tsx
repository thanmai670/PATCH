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
    <div className="p-5">
      {warning && (
        <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="text-xs font-semibold text-amber-300">Low-confidence match</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-200/85">{warning}</p>
        </div>
      )}
      {node.requiresHumanReview && !warning && <ReviewBanner change={change} />}

      <p className="text-[11px] uppercase tracking-wider text-white/35">Document diff</p>
      <h2 className="mt-1 text-base font-semibold leading-snug">{node.title}</h2>
      <p className="mt-1 text-xs text-white/45">
        {str(p, "paragraphContext", "Body text")} ·{" "}
        {occurrences === 1 ? "1 occurrence" : `${occurrences} occurrences`} of{" "}
        {change.previousValue}
      </p>

      <div className="mt-4 space-y-2">
        <div className="rounded-md border border-red-500/25 bg-red-500/[0.06] p-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-red-300/70">
            Current
          </p>
          <p className="text-[13px] leading-relaxed text-white/80">
            <Marked
              text={node.excerpt?.before ?? "—"}
              needle={change.previousValue}
              tone="stale"
            />
          </p>
        </div>

        <div className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-emerald-300/70">
            Proposed
          </p>
          {rewriting ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="w-full resize-y rounded border border-white/15 bg-black/40 p-2 text-[13px] leading-relaxed text-white/90 outline-none focus:border-emerald-400/60"
            />
          ) : (
            <p className="text-[13px] leading-relaxed text-white/80">
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
            Accept change
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
            {rewriting ? "Done rewriting" : "Rewrite"}
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
            Mark exception
          </Action>
        )}
      </div>

      {decision && (
        <p className="mt-3 text-[11px] text-emerald-300/80">
          {decision === "accept"
            ? "Queued in the Repair Plan."
            : "Excluded — this artefact will not be repaired."}
        </p>
      )}

      <Provenance node={node} />
    </div>
  );
}
