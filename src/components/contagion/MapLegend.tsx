"use client";

import { STATUS_COLOR, STATUS_DEEP, DISPOSITION_RING, REVIEW_COLOR } from "./tokens";

/**
 * Mandatory, not decorative (ADR-0008): `editable` draws no ring, so the *absence*
 * of a ring carries meaning, and absence is only legible if it is written down.
 * Phrased as what the reader is looking at, not as field names.
 */
export function MapLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-ink-2"
    >
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <Item>
          <Disc color={STATUS_COLOR.infected} edge={STATUS_DEEP.infected} />
          has the old figure
        </Item>
        <Item>
          <Disc color={STATUS_COLOR.exposed} edge={STATUS_DEEP.exposed} />
          derived from it
        </Item>
        <Item>
          <Disc color={STATUS_COLOR.immune} edge={STATUS_DEEP.immune} />
          already correct
        </Item>
      </div>

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <Item>
          <Ring color={DISPOSITION_RING.historical!} />
          keep as record
        </Item>
        <Item>
          <Ring color={DISPOSITION_RING.irreversible!} />
          already sent
        </Item>
        <Item>
          <span
            className="grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 bg-surface text-[9px] font-bold"
            style={{ borderColor: REVIEW_COLOR, color: "#9A5B06" }}
          >
            !
          </span>
          you decide
        </Item>
      </div>

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-ink-3">
        <Item>
          <Dash pattern="none" />
          written out
        </Item>
        <Item>
          <Dash pattern="6 4" />
          meaning match
        </Item>
        <Item>
          <Dash pattern="2 5" />
          agent inferred
        </Item>
      </div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center gap-2">{children}</span>;
}

function Disc({ color, edge }: { color: string; edge: string }) {
  return (
    <span
      className="h-3 w-3 shrink-0 rounded-full border"
      style={{ background: color, borderColor: edge }}
    />
  );
}

function Ring({ color }: { color: string }) {
  return (
    <span
      className="h-3.5 w-3.5 shrink-0 rounded-full border-[2.5px] bg-surface"
      style={{ borderColor: color }}
    />
  );
}

function Dash({ pattern }: { pattern: string }) {
  return (
    <svg width={22} height={6} className="shrink-0" aria-hidden>
      <line
        x1={1}
        y1={3}
        x2={21}
        y2={3}
        stroke="#828E9B"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={pattern === "none" ? undefined : pattern}
      />
    </svg>
  );
}
