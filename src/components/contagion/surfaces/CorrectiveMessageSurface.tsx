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
    <div className="px-6 py-6">
      {/* The refusal comes first, before anything that looks like a control. */}
      <div className="rounded-lg border-2 border-irreversible/55 bg-irreversible/[0.08] p-4">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-irreversible-deep">
          This one cannot be quietly fixed
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          It went out {sentAt ? `on ${formatDate(sentAt, "an earlier date")}` : "already"} and people outside the
          company have read it. Editing it now would change history without telling anyone,
          so PATCH will not — and there is no button here that does.
        </p>
      </div>

      <h2 className="mt-4 text-[17px] font-semibold leading-snug text-ink">{node.title}</h2>

      <div className="mt-3 rounded-lg border border-rule bg-sunk/50 p-3.5">
        <p className="text-[12.5px] text-ink-3">
          It reached
        </p>
        <ul className="mt-1.5 space-y-1">
          {recipients.map((r) => (
            <li key={r} className="font-mono text-[12.5px] text-ink">
              {r}
            </li>
          ))}
          {recipients.length === 0 && (
            <li className="text-[12.5px] text-ink-3">recipients unknown</li>
          )}
        </ul>
        {node.excerpt && (
          <p className="mt-2.5 border-l-2 border-irreversible/40 pl-2.5 text-[12.5px] leading-relaxed text-ink-2">
            {node.excerpt.before}
          </p>
        )}
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
        {str(p, "impactExplanation")}
      </p>

      {available.includes("draft_correction") && (
        <div className="mt-4">
          <p className="mb-1.5 text-[12.5px] text-ink-3">
            A correction you can send instead
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            className="w-full resize-y rounded-md border border-rule bg-surface p-3 text-[13px] leading-relaxed text-ink outline-none focus:border-ink"
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
            Send this correction
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
            Don't send anything
          </Action>
        )}
      </div>

      {decision && (
        <p className="mt-3 text-[12.5px] text-immune-deep">
          {decision === "draft_correction"
            ? `Correction ready for ${recipients.length} ${recipients.length === 1 ? "person" : "people"}. The message they already have stays exactly as it was.`
            : "Nothing will be sent. The message they already have stays as it was."}
        </p>
      )}

      <Provenance node={node} />
    </div>
  );
}
