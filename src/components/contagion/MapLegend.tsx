"use client";

import { STATUS_COLOR, DISPOSITION_RING, REVIEW_COLOR } from "./tokens";

/**
 * Mandatory, not decorative (ADR-0008): `editable` draws no ring, so the *absence*
 * of a ring carries meaning — and absence is only legible if it is written down.
 */
export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 flex gap-6 rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-[11px] backdrop-blur">
      <div>
        <p className="mb-1.5 uppercase tracking-wider text-white/35">
          Infection status — fill
        </p>
        <ul className="space-y-1">
          {(
            [
              ["infected", "Infected — carries the stale value"],
              ["exposed", "Exposed — depends on it"],
              ["immune", "Immune — checked, correct"],
            ] as const
          ).map(([key, label]) => (
            <li key={key} className="flex items-center gap-2 text-white/65">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: STATUS_COLOR[key] }}
              />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1.5 uppercase tracking-wider text-white/35">
          Repair disposition — ring
        </p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2 text-white/65">
            <span
              className="h-2.5 w-2.5 rounded-full border-2"
              style={{ borderColor: DISPOSITION_RING.historical! }}
            />
            Historical — preserve, annotate only
          </li>
          <li className="flex items-center gap-2 text-white/65">
            <span
              className="h-2.5 w-2.5 rounded-full border-2"
              style={{ borderColor: DISPOSITION_RING.irreversible! }}
            />
            Irreversible — already sent
          </li>
          <li className="flex items-center gap-2 text-white/45">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-transparent" />
            <em>No ring</em> — editable
          </li>
        </ul>
      </div>

      <div>
        <p className="mb-1.5 uppercase tracking-wider text-white/35">
          Match kind — edge
        </p>
        <ul className="space-y-1 text-white/65">
          <li className="flex items-center gap-2">
            <Dash pattern="none" /> Exact — literal match
          </li>
          <li className="flex items-center gap-2">
            <Dash pattern="7 5" /> Semantic — meaning match
          </li>
          <li className="flex items-center gap-2">
            <Dash pattern="2 6" /> Inferred — agent reasoning
          </li>
        </ul>
        <p className="mt-2 flex items-center gap-2 text-white/65">
          <span
            className="grid h-3 w-3 place-items-center rounded-full text-[8px] font-bold text-black"
            style={{ background: REVIEW_COLOR }}
          >
            !
          </span>
          Needs human review
        </p>
      </div>
    </div>
  );
}

function Dash({ pattern }: { pattern: string }) {
  return (
    <svg width={22} height={6} aria-hidden>
      <line
        x1={1}
        y1={3}
        x2={21}
        y2={3}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={pattern === "none" ? undefined : pattern}
      />
    </svg>
  );
}
