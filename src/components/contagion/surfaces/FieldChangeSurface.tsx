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
    <div className="p-5">
      <p className="text-[11px] uppercase tracking-wider text-white/35">Field change</p>
      <h2 className="mt-1 text-base font-semibold leading-snug">{node.title}</h2>

      <table className="mt-4 w-full border-separate border-spacing-0 text-[13px]">
        <tbody>
          <tr>
            <td className="w-[36%] rounded-l-md border border-r-0 border-white/10 bg-white/[0.03] px-3 py-2 align-middle font-mono text-[11px] text-white/50">
              {node.excerpt?.field ?? "field"}
            </td>
            <td className="border-y border-white/10 bg-white/[0.03] px-3 py-2 align-middle">
              <span className="text-red-300/90 line-through">
                {node.excerpt?.before ?? change.previousValue}
              </span>
            </td>
            <td className="w-7 border-y border-white/10 bg-white/[0.03] text-center text-white/30">
              →
            </td>
            <td className="rounded-r-md border border-l-0 border-white/10 bg-white/[0.03] px-3 py-2 align-middle font-medium text-emerald-300">
              {node.excerpt?.after ?? change.newValue}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-white/40">Verified by</span>
        {verifiedBy ? (
          <Chip tone={SOURCE_TONE[verifiedBy.sourceStatus]}>
            {verifiedBy.sourceStatus} · {verifiedBy.title}
          </Chip>
        ) : (
          <Chip tone="neutral">unverified</Chip>
        )}
      </div>

      {opportunities.length > 0 && (
        <div className="mt-4 rounded-md border border-white/10 bg-white/[0.02] p-3">
          <p className="text-[11px] text-white/45">
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
            Update field
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
            : "Excluded — this record will not be updated."}
        </p>
      )}

      <Provenance node={node} />
    </div>
  );
}
