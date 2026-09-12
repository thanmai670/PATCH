"use client";

import { useState } from "react";
import type { InfectionNode, TruthChange } from "@/contract";
import { Action, Provenance } from "../atoms";
import { actions, str, strList } from "../surfaceProps";
import { formatDate } from "../formatDate";

/**
 * An Irreversible artefact. This surface renders NO control that would apply the
 * change — not a disabled one, an absent one (ADR-0009). The artefact has been read
 * by someone outside the workspace; the only honest action is a correction.
 */
export function CorrectiveMessageSurface({
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
  const recipients = strList(p, "recipients");
  const sentAt = str(p, "sentAt");

  const [body, setBody] = useState(
    `Correction to our earlier message on ${change.subject}.\n\n` +
      `We confirmed ${change.previousValue}. The approved value is ${change.newValue}. ` +
      `Please disregard the earlier figure and use ${change.newValue} for all ongoing work.\n\n` +
      `Apologies for the confusion.`,
  );
  const [decision, setDecision] = useState<string | null>(null);

  return (
    <div className="p-5">
      {/* The refusal comes first, before anything that looks like a control. */}
      <div className="rounded-md border-2 border-pink-500/60 bg-pink-500/10 p-3.5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pink-300">
          <span aria-hidden>⛔</span> Cannot be repaired silently
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-pink-100/80">
          This message was delivered {sentAt ? `on ${formatDate(sentAt, "an earlier date")}` : "already"} and has
          been read outside the workspace. PATCH will not edit it, and there is no action
          here that would.
        </p>
      </div>

      <h2 className="mt-4 text-base font-semibold leading-snug">{node.title}</h2>

      <div className="mt-3 rounded-md border border-white/10 bg-white/[0.02] p-3">
        <p className="text-[11px] uppercase tracking-wider text-white/35">
          Already delivered to
        </p>
        <ul className="mt-1.5 space-y-1">
          {recipients.map((r) => (
            <li key={r} className="font-mono text-[12px] text-white/70">
              {r}
            </li>
          ))}
          {recipients.length === 0 && (
            <li className="text-[12px] text-white/40">recipients unknown</li>
          )}
        </ul>
        {node.excerpt && (
          <p className="mt-2.5 border-l-2 border-pink-500/40 pl-2.5 text-[12px] italic leading-relaxed text-white/50">
            {node.excerpt.before}
          </p>
        )}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-white/60">
        {str(p, "impactExplanation")}
      </p>

      {available.includes("draft_correction") && (
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] uppercase tracking-wider text-white/35">
            Corrective message — draft
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            className="w-full resize-y rounded-md border border-white/15 bg-black/40 p-2.5 text-[12px] leading-relaxed text-white/85 outline-none focus:border-pink-400/60"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {available.includes("draft_correction") && (
          <Action
            variant="primary"
            active={decision === "draft_correction"}
            onClick={() => {
              setDecision("draft_correction");
              onDecide("draft_correction", { recipients, body });
            }}
          >
            Send correction for approval
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
            No correction needed
          </Action>
        )}
      </div>

      {decision && (
        <p className="mt-3 text-[11px] text-emerald-300/80">
          {decision === "draft_correction"
            ? `Correction queued for ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}. The original message is unchanged.`
            : "No correction will be sent. The original message is unchanged."}
        </p>
      )}

      <Provenance node={node} />
    </div>
  );
}
