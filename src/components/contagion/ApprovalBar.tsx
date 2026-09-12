"use client";

import type { InfectionNode } from "@/contract";
import type { LassoResult } from "./InfectionMap";
import { Action } from "./atoms";

/**
 * The lasso's exclusions are stated out loud (ADR-0010). Restraint nobody is told
 * about scores nothing — this bar is where PATCH says what it held back and why.
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
      <div className="pointer-events-none absolute right-4 top-4 max-w-[300px] text-right">
        {healedCount > 0 ? (
          <p className="inline-block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-200/90">
            {healedCount} repair{healedCount === 1 ? "" : "s"} approved
            {unconfirmedCount > 0 && (
              <span className="text-white/50">
                {" · "}
                {unconfirmedCount} not yet written to workspace
              </span>
            )}
          </p>
        ) : (
          <p className="inline-block rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] text-white/40">
            Drag across the map to select safe repairs
          </p>
        )}
      </div>
    );
  }

  const why = (node: InfectionNode) =>
    node.disposition === "irreversible"
      ? "already sent"
      : node.disposition === "historical"
        ? "preserve as historical"
        : "needs human review";

  return (
    <div className="absolute right-4 top-4 w-[300px] rounded-lg border border-white/15 bg-black/75 p-3.5 backdrop-blur">
      <p className="text-[13px] font-semibold">
        <span className="text-emerald-300">{lasso.safe.length} safe</span>
        {lasso.excluded.length > 0 && (
          <span className="text-white/50">
            {" · "}
            {lasso.excluded.length} excluded
          </span>
        )}
      </p>

      {lasso.excluded.length > 0 && (
        <>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">
            Excluded from batch approval — review these individually.
          </p>
          <ul className="mt-2 space-y-1">
            {lasso.excluded.map((id) => {
              const node = byId.get(id);
              if (!node) return null;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onInspect(id)}
                    className="w-full rounded px-1.5 py-1 text-left text-[11px] text-white/60 hover:bg-white/10 hover:text-white/90"
                  >
                    <span className="block truncate">{node.title}</span>
                    <span className="text-white/35">{why(node)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Action variant="primary" onClick={onApprove}>
          {approving
            ? "Approving…"
            : `Approve ${lasso.safe.length} repair${lasso.safe.length === 1 ? "" : "s"}`}
        </Action>
        <Action variant="quiet" onClick={onClear}>
          Clear
        </Action>
      </div>

      {lasso.safe.length === 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-300/80">
          Nothing in this selection can be repaired without a human decision.
        </p>
      )}
    </div>
  );
}
