"use client";

import type { InfectionNode } from "@/contract";
import type { LassoResult } from "./InfectionMap";
import { Action } from "./atoms";

/**
 * The lasso's exclusions are stated out loud (ADR-0010). Restraint nobody is told
 * about scores nothing — this is where PATCH says what it held back and why.
 *
 * It sits in the footer rather than floating over the map, so it can never cover the
 * artefacts it is talking about.
 */
export function ApprovalBar({
  lasso,
  byId,
  approving,
  healedCount,
  unconfirmedCount,
  onApprove,
  onClear,
  onInspect,
}: {
  lasso: LassoResult;
  byId: Map<string, InfectionNode>;
  approving: boolean;
  healedCount: number;
  unconfirmedCount: number;
  onApprove: () => void;
  onClear: () => void;
  onInspect: (id: string) => void;
}) {
  const touched = lasso.safe.length + lasso.excluded.length;

  if (touched === 0) {
    return (
      <div className="flex items-center justify-end text-right">
        {healedCount > 0 ? (
          <p className="text-[12.5px] text-immune-deep">
            You approved {healedCount} repair{healedCount === 1 ? "" : "s"}.
            {unconfirmedCount > 0 && (
              <span className="text-ink-3"> Nothing has reached the workspace yet.</span>
            )}
          </p>
        ) : (
          <p className="text-[12.5px] text-ink-3">
            Drag a box across the map to repair several at once
          </p>
        )}
      </div>
    );
  }

  const why = (node: InfectionNode) =>
    node.disposition === "irreversible"
      ? "already sent out"
      : node.disposition === "historical"
        ? "a record of what was built"
        : "PATCH is not confident enough";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        <p className="text-[13px] font-medium text-ink">
          {lasso.safe.length === 0
            ? "None of these can be repaired on their own"
            : `${lasso.safe.length} of these ${touched} can be repaired now`}
        </p>
        {lasso.safe.length > 0 && (
          <Action variant="primary" onClick={onApprove} disabled={approving}>
            {approving
              ? "Repairing…"
              : `Repair ${lasso.safe.length === 1 ? "it" : `all ${lasso.safe.length}`}`}
          </Action>
        )}
        <Action variant="quiet" onClick={onClear}>
          Cancel
        </Action>
      </div>

      {lasso.excluded.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="text-[12px] text-ink-3">
            Holding back {lasso.excluded.length} for you:
          </span>
          {lasso.excluded.map((id) => {
            const node = byId.get(id);
            if (!node) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onInspect(id)}
                title={why(node)}
                className="max-w-[170px] truncate rounded-full border border-rule bg-surface px-2.5 py-1 text-[12px] text-ink hover:bg-sunk"
              >
                {node.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
