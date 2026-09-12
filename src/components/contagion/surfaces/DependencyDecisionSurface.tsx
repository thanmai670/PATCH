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
    <div className="p-5">
      {node.requiresHumanReview && <ReviewBanner change={change} />}

      <p className="text-[11px] uppercase tracking-wider text-white/35">
        Dependency decision
      </p>
      <h2 className="mt-1 text-base font-semibold leading-snug">{node.title}</h2>

      <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/[0.07] p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-amber-300/80">
          Exposed — no literal match
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">
          {str(p, "impactStatement", "Downstream work may depend on the previous value.")}
        </p>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-white/45">
        This artefact never contained &ldquo;{change.previousValue}&rdquo;, so there is
        nothing to rewrite. The decision is who checks the downstream work.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-white/35">
            Assign to
          </span>
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-1.5 text-[13px] text-white/85 outline-none focus:border-white/40"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/35">
            Urgency
          </span>
          <div className="flex gap-1.5">
            {URGENCIES.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUrgency(u)}
                className={`rounded-md border px-3 py-1 text-[11px] capitalize transition-colors ${
                  urgency === u
                    ? "border-amber-400/70 bg-amber-500/20 text-amber-200"
                    : "border-white/15 text-white/50 hover:bg-white/5"
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
            Create review task
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
            Preserve original
          </Action>
        )}
      </div>

      {decision && (
        <p className="mt-3 text-[11px] text-emerald-300/80">
          {decision === "create_review"
            ? `Review task queued for ${assignee} · ${urgency} urgency. The original task is untouched.`
            : "Original preserved — no downstream work is created."}
        </p>
      )}

      <Provenance node={node} />
    </div>
  );
}
