"use client";

import { useState } from "react";
import type { Evidence, InfectionNode, TruthChange } from "@/contract";
import { Action, Chip, Provenance } from "../atoms";
import { actions, strList, str } from "../surfaceProps";

const SOURCE_TONE = {
  live: "fresh",
  cached: "warn",
  unverified: "neutral",
} as const;

/**
 * A structured record field. Not a prose diff — a record row, because that is the
 * shape of the thing being changed. The commercial blast radius sits next to it.
 */
export function FieldChangeSurface({
  node,
  change,
  evidence,
  onDecide,
}: {
  node: InfectionNode;
  change: TruthChange;
  evidence: Evidence[];
  onDecide: (decision: string, payload?: Record<string, unknown>) => void;
}) {
  const p = node.surfaceProps;
  const available = actions(p);
  const opportunities = strList(p, "connectedOpportunities");
  const verifiedBy = evidence.find((e) => e.id === str(p, "verifiedBy"));
  const [decision, setDecision] = useState<string | null>(null);

  return (
    <div className="px-6 py-6">
      <p className="text-[12.5px] text-ink-3">Record field</p>
      <h2 className="mt-1 text-[17px] font-semibold leading-snug text-ink">{node.title}</h2>

      <table className="mt-4 w-full border-separate border-spacing-0 text-[13px]">
        <tbody>
          <tr>
            <td className="w-[36%] rounded-l-md border border-r-0 border-rule bg-sunk/50 px-3 py-2 align-middle font-mono text-[12.5px] text-ink-2">
              {node.excerpt?.field ?? "field"}
            </td>
            <td className="border-y border-rule bg-sunk/50 px-3 py-2 align-middle">
              <span className="font-mono text-ink-3 line-through decoration-infected/70">
                {node.excerpt?.before ?? change.previousValue}
              </span>
            </td>
            <td className="w-7 border-y border-rule bg-sunk/50 text-center text-ink-3">
              →
            </td>
            <td className="rounded-r-md border border-l-0 border-rule bg-sunk/50 px-3 py-2 align-middle font-mono font-semibold text-immune-deep">
              {node.excerpt?.after ?? change.newValue}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-ink-3">Checked against</span>
        {verifiedBy ? (
          <Chip tone={SOURCE_TONE[verifiedBy.sourceStatus]}>
            {verifiedBy.sourceStatus} · {verifiedBy.title}
          </Chip>
        ) : (
          <Chip tone="neutral">unverified</Chip>
        )}
      </div>

      {opportunities.length > 0 && (
        <div className="mt-4 rounded-lg border border-rule bg-sunk/50 p-3.5">
          <p className="text-[12.5px] text-ink-2">
            {opportunities.length} connected{" "}
            {opportunities.length === 1
              ? "opportunity references"
              : "opportunities reference"}{" "}
            this record
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {opportunities.map((o) => (
              <Chip key={o}>{o}</Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {available.includes("accept") && (
          <Action
            variant="primary"
            active={decision === "accept"}
            onClick={() => {
              setDecision("accept");
              onDecide("accept", { field: node.excerpt?.field, value: change.newValue });
            }}
          >
            Update the record
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
            : "Skipped. The record stays as it is."}
        </p>
      )}

      <Provenance node={node} />
    </div>
  );
}
