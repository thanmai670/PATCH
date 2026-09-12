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
    <div className="px-6 py-6">
      <div className="rounded-lg border-2 border-historical/55 bg-historical/[0.08] p-4">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-historical-deep">
          Leave this one alone
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          {str(
            p,
            "reason",
            "This was accurate when it was written. Changing it now would misrepresent what was actually built.",
          )}
        </p>
      </div>

      <h2 className="mt-4 text-[17px] font-semibold leading-snug text-ink">{node.title}</h2>

      <div className="mt-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
          The record, as it stands
        </p>
        <div className="rounded-md border border-rule bg-sunk/50 p-3">
          <p className="select-none text-[13.5px] leading-relaxed text-ink-3">
            {node.excerpt?.before ?? "—"}
          </p>
        </div>
        <p className="mt-1.5 text-[12px] text-ink-3">
          {change.previousValue} stays. That is not an error; that is the motor that went into
          the machine.
        </p>
      </div>

      {available.includes("annotate") && (
        <div className="mt-4">
          <p className="mb-1.5 text-[12.5px] text-ink-3">
            A note to attach alongside it
          </p>
          <textarea
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-md border border-historical/35 bg-surface p-3 text-[13px] leading-relaxed text-ink outline-none focus:border-historical"
          />
          <p className="mt-1.5 text-[12px] text-ink-3">
            The note sits next to the record. The record itself is never touched.
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
            Attach the note
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
            Do nothing
          </Action>
        )}
      </div>

      {decision && (
        <p className="mt-3 text-[12.5px] text-immune-deep">
          {decision === "annotate"
            ? "Note ready to attach. The record is unchanged."
            : "Nothing will be attached. The record is unchanged."}
        </p>
      )}

      <Provenance node={node} />
    </div>
  );
}
