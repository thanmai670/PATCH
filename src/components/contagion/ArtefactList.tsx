"use client";

import type { InfectionNode, TruthChange } from "@/contract";
import { ArtefactIcon } from "./ArtefactIcon";
import { STATUS_COLOR, STATUS_DEEP, HEALED_COLOR, isSafe } from "./tokens";
import {
  KIND_LABEL,
  TONE_COLOR,
  plainAction,
  plainOutcome,
  plainStatus,
  plainWhy,
} from "./plainLanguage";

/**
 * The list is the readable view; the map is the one that shows how far it travelled.
 * Someone who never decodes the map can still work entirely from here, which is the
 * point — nothing in the product should depend on reading a legend first.
 */
export function ArtefactList({
  nodes,
  change,
  selectedId,
  hoveredId,
  healed,
  unconfirmed,
  outcomes,
  onSelect,
  onHover,
}: {
  nodes: InfectionNode[];
  change: TruthChange;
  selectedId: string | null;
  hoveredId: string | null;
  healed: string[];
  unconfirmed: string[];
  outcomes: Record<string, string>;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}) {
  const order = [...nodes].sort((a, b) => Number(isSafe(b)) - Number(isSafe(a)));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-rule px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">What this touches</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
          Every place the old figure reached. Pick one to see what PATCH wants to do
          about it.
        </p>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {order.map((node) => {
          const status = plainStatus(node);
          const isHealed = healed.includes(node.id);
          const decided = outcomes[node.id];
          const tone = isHealed ? TONE_COLOR.done : TONE_COLOR[status.tone];
          const selected = selectedId === node.id;
          const hovered = hoveredId === node.id;

          return (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onSelect(selected ? null : node.id)}
                onMouseEnter={() => onHover(node.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(node.id)}
                onBlur={() => onHover(null)}
                className={`mb-1.5 flex w-full gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selected
                    ? "border-ink bg-sunk"
                    : hovered
                      ? "border-rule bg-sunk/70"
                      : "border-transparent hover:bg-sunk/50"
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  <svg width={30} height={30} viewBox="-15 -15 30 30" aria-hidden>
                    <circle
                      r={14}
                      fill={isHealed ? HEALED_COLOR : STATUS_COLOR[node.status]}
                      stroke={isHealed ? HEALED_COLOR : STATUS_DEEP[node.status]}
                      strokeWidth={1.25}
                    />
                    <ArtefactIcon kind={node.kind} size={17} color="rgb(var(--map-disc-ink))" />
                  </svg>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] text-ink-3">
                    {KIND_LABEL[node.kind]}
                  </span>
                  <span className="mt-0.5 block text-[13.5px] font-medium leading-snug text-ink">
                    {node.title}
                  </span>
                  <span className="mt-1 block text-[12.5px] leading-snug text-ink-2">
                    {decided ? plainOutcome(decided) : plainWhy(node, change)}
                  </span>
                  <span className="mt-1 block text-[12.5px] leading-snug text-ink-3">
                    PATCH suggests: {plainAction(node).toLowerCase()}
                  </span>
                  <span
                    className={`mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium ${tone.text}`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: tone.dot }}
                    />
                    {isHealed
                      ? unconfirmed.includes(node.id)
                        ? "Waiting to be written"
                        : "Written to the workspace"
                      : status.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
