"use client";

import { useState } from "react";
import type { InfectionNode, TruthChange } from "@/contract";
import { Action, Provenance, ReviewBanner } from "../atoms";
import { actions, str } from "../surfaceProps";

const URGENCIES = ["low", "normal", "high"] as const;

/**
 * An Exposed artefact: it never contained the stale literal, so there is nothing to
 * diff. The surface is therefore a routing decision, not an edit — who looks at this,
 * how urgently, and whether the original is left alone.
 */
export function DependencyDecisionSurface({
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
  const [assignee, setAssignee] = useState(str(p, "suggestedAssignee", "Unassigned"));
  const [urgency, setUrgency] = useState(str(p, "suggestedUrgency", "normal"));
  const [decision, setDecision] = useState<string | null>(null);

  return (
    <div className="px-6 py-6">
      {node.requiresHumanReview && <ReviewBanner change={change} />}

      <p className="text-[12.5px] text-ink-3">
        Work that depends on this
      </p>
      <h2 className="mt-1 text-[17px] font-semibold leading-snug text-ink">{node.title}</h2>

      <div className="mt-3 rounded-lg border border-exposed/40 bg-exposed/[0.08] p-3.5">
        <p className="text-[13px] font-semibold text-exposed-deep">
          The old figure was never written here
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
          {str(p, "impactStatement", "Downstream work may depend on the previous value.")}
        </p>
      </div>

      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-2">
        Nobody typed &ldquo;{change.previousValue}&rdquo; into this task, but the work was sized
        around it. There is no text to fix — only a question of who checks it.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-[12.5px] text-ink-3">
            Who should check it
          </span>
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-full rounded-md border border-rule bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-ink"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-[12.5px] text-ink-3">
            How soon
          </span>
          <div className="flex gap-1.5">
            {URGENCIES.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUrgency(u)}
                className={`rounded-md border px-3.5 py-1.5 text-[12.5px] capitalize transition-colors ${
                  urgency === u
                    ? "border-ink bg-ink text-white"
                    : "border-rule bg-surface text-ink-2 hover:bg-sunk"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {available.includes("create_review") && (
          <Action
            variant="primary"
            active={decision === "create_review"}
            onClick={() => {
              setDecision("create_review");
              onDecide("create_review", { assignee, urgency });
            }}
          >
            Ask them to check it
          </Action>
        )}
        {available.includes("preserve_original") && (
          <Action
            active={decision === "preserve_original"}
            onClick={() => {
              setDecision("preserve_original");
              onDecide("preserve_original");
            }}
          >
            Leave the task alone
          </Action>
        )}
      </div>

      {decision && (
        <p className="mt-3 text-[12.5px] text-immune-deep">
          {decision === "create_review"
            ? `${assignee} will be asked to check the cable sizing. The task itself is unchanged.`
            : "Left alone. Nobody will be asked to check it."}
        </p>
      )}

      <Provenance node={node} />
    </div>
  );
}
