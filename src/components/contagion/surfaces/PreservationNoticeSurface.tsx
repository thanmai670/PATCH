"use client";

import { useState } from "react";
import type { InfectionNode, TruthChange } from "@/contract";
import { Action, Provenance } from "../atoms";
import { actions, str } from "../surfaceProps";

/**
 * A Historical artefact. Like the corrective surface it renders NO control that
 * would apply the change (ADR-0009) — the record was accurate when written and
 * editing it would falsify history. The original text is shown locked.
 */
export function PreservationNoticeSurface({
  node,
  change,
  onDecide,
}: {
  node: InfectionNode;
  change: TruthChange;
  onDecide: (decision: string, payload?: Record<string, unknown>) => void;
}) {
  const p = node.surfaceProps;
  const available = actions(p);
  const [notice, setNotice] = useState(str(p, "proposedNotice"));
  const [decision, setDecision] = useState<string | null>(null);

  return (
    <div className="p-5">
      <div className="rounded-md border-2 border-violet-500/60 bg-violet-500/10 p-3.5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
          <span aria-hidden>🔒</span> Preserve as historical
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-violet-100/80">
          {str(
            p,
            "reason",
            "This record was accurate when written. Editing it would falsify history.",
          )}
        </p>
      </div>

      <h2 className="mt-4 text-base font-semibold leading-snug">{node.title}</h2>

      <div className="mt-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/35">
          <span aria-hidden>🔒</span> Original record — locked
        </p>
        <div className="rounded-md border border-white/10 bg-white/[0.015] p-3">
          <p className="select-none text-[13px] leading-relaxed text-white/35">
            {node.excerpt?.before ?? "—"}
          </p>
        </div>
        <p className="mt-1.5 text-[11px] text-white/30">
          {change.previousValue} stays in this document. It is not a mistake — it is what
          was installed.
        </p>
      </div>

      {available.includes("annotate") && (
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] uppercase tracking-wider text-white/35">
            Annotation to attach
          </p>
          <textarea
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-md border border-violet-400/30 bg-black/40 p-2.5 text-[12px] leading-relaxed text-white/85 outline-none focus:border-violet-400/70"
          />
          <p className="mt-1.5 text-[11px] text-white/30">
            Attached alongside the record. The record itself is untouched.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {available.includes("annotate") && (
          <Action
            variant="primary"
            active={decision === "annotate"}
            onClick={() => {
              setDecision("annotate");
              onDecide("annotate", { notice });
            }}
          >
            Annotate only
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
            Leave untouched
          </Action>
        )}
      </div>

      {decision && (
        <p className="mt-3 text-[11px] text-emerald-300/80">
          {decision === "annotate"
            ? "Annotation queued. The historical record is unchanged."
            : "Nothing will be attached. The historical record is unchanged."}
        </p>
      )}

      <Provenance node={node} />
    </div>
  );
}
