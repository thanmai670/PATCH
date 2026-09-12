"use client";

import { useMemo, useRef, useState } from "react";
import type { InfectionReport } from "@/contract";
import { layoutReport, CX, CY, VIEW_W, VIEW_H, RING_MS } from "./layout";
import {
  STATUS_COLOR,
  DISPOSITION_RING,
  MATCH_DASH,
  REVIEW_COLOR,
  HEALED_COLOR,
  isSafe,
} from "./tokens";
import { MapLegend } from "./MapLegend";

const NODE_R = 26;
const RING_R = 35;
/** Below this the drag was a click, not a lasso. */
const DRAG_THRESHOLD = 6;

export type LassoResult = { safe: string[]; excluded: string[] };

type Props = {
  report: InfectionReport;
  selectedId: string | null;
  lassoed: string[];
  onSelect: (id: string | null) => void;
  onLasso: (result: LassoResult) => void;
  /** Approved nodes, healed green (ADR-0011). */
  healed?: string[];
  /** Approved but not yet written to the workspace. */
  unconfirmed?: string[];
};

function short(title: string, max = 26) {
  return title.length <= max ? title : `${title.slice(0, max - 1)}…`;
}

export function InfectionMap({
  report,
  selectedId,
  lassoed,
  onSelect,
  onLasso,
  healed = [],
  unconfirmed = [],
}: Props) {
  const { nodes, edges } = useMemo(() => layoutReport(report), [report]);
  const byId = useMemo(
    () => new Map(nodes.map((n) => [n.node.id, n])),
    [nodes],
  );
  const healedSet = useMemo(() => new Set(healed), [healed]);
  const lassoedSet = useMemo(() => new Set(lassoed), [lassoed]);
  const unconfirmedSet = useMemo(() => new Set(unconfirmed), [unconfirmed]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );
  const movedRef = useRef(false);

  /** Screen coordinates → viewBox coordinates. */
  function toView(ev: React.PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }

  function onPointerDown(ev: React.PointerEvent<SVGSVGElement>) {
    const p = toView(ev);
    if (!p) return;
    movedRef.current = false;
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    ev.currentTarget.setPointerCapture(ev.pointerId);
  }

  function onPointerMove(ev: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const p = toView(ev);
    if (!p) return;
    if (Math.hypot(p.x - drag.x0, p.y - drag.y0) > DRAG_THRESHOLD) movedRef.current = true;
    setDrag({ ...drag, x1: p.x, y1: p.y });
  }

  function onPointerUp(ev: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    ev.currentTarget.releasePointerCapture?.(ev.pointerId);

    if (!movedRef.current) {
      // A click on empty space clears the selection.
      setDrag(null);
      onSelect(null);
      return;
    }

    const lo = { x: Math.min(drag.x0, drag.x1), y: Math.min(drag.y0, drag.y1) };
    const hi = { x: Math.max(drag.x0, drag.x1), y: Math.max(drag.y0, drag.y1) };
    const inside = nodes.filter(
      ({ x, y }) => x >= lo.x && x <= hi.x && y >= lo.y && y <= hi.y,
    );

    // ADR-0010: the lasso resolves to the Safe Set, and says what it left out.
    onLasso({
      safe: inside.filter((n) => isSafe(n.node)).map((n) => n.node.id),
      excluded: inside.filter((n) => !isSafe(n.node)).map((n) => n.node.id),
    });
    setDrag(null);
  }

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none"
        aria-label={`Contagion map: ${nodes.length} affected artefacts`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onLostPointerCapture={() => setDrag(null)}
      >
        <defs>
          <filter id="patch-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Edges. matchKind is carried here, never on the node (ADR-0008). ── */}
        <g>
          {edges.map((e) => {
            const len = Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y);
            const targetId = e.toId;
            const target = byId.get(targetId);
            const streak =
              target && healedSet.has(targetId)
                ? HEALED_COLOR
                : target
                  ? STATUS_COLOR[target.node.status]
                  : STATUS_COLOR.infected;
            const delay = (e.depth - 1) * RING_MS;
            return (
              <g key={e.id}>
                <line
                  className="patch-line"
                  x1={e.from.x}
                  y1={e.from.y}
                  x2={e.to.x}
                  y2={e.to.y}
                  stroke="rgba(255,255,255,0.20)"
                  strokeWidth={1.5}
                  strokeDasharray={MATCH_DASH[e.matchKind]}
                  strokeLinecap="round"
                  style={{ animationDelay: `${delay + 200}ms` }}
                />
                <line
                  className="patch-edge"
                  x1={e.from.x}
                  y1={e.from.y}
                  x2={e.to.x}
                  y2={e.to.y}
                  stroke={streak}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={len}
                  style={
                    {
                      "--patch-len": `${len}`,
                      animationDelay: `${delay}ms`,
                    } as React.CSSProperties
                  }
                />
              </g>
            );
          })}
        </g>

        {/* ── Patient Zero. An origin, never a target — it is never repaired. ── */}
        <g transform={`translate(${CX},${CY})`} pointerEvents="none">
          <circle className="patch-centre" r={52} fill={STATUS_COLOR.infected} />
          <circle r={30} fill="#18181f" stroke="rgba(255,255,255,0.28)" strokeWidth={1.5} />
          <text textAnchor="middle" dy={7} fontSize={22}>
            🩹
          </text>
          <text
            textAnchor="middle"
            dy={56}
            fontSize={13}
            fill="rgba(255,255,255,0.75)"
            fontWeight={600}
          >
            Patient Zero
          </text>
          <text textAnchor="middle" dy={74} fontSize={11.5} fill="rgba(255,255,255,0.42)">
            {report.change.patientZero?.channel ?? "Nominated in the UI"}
          </text>
        </g>

        {/* ── Artefacts. Fill = status, ring = disposition (ADR-0008). ── */}
        {nodes.map(({ node, x, y, depth }) => {
          const isHealed = healedSet.has(node.id);
          const fill = isHealed ? HEALED_COLOR : STATUS_COLOR[node.status];
          const ring = DISPOSITION_RING[node.disposition];
          const isSelected = selectedId === node.id;
          const isLassoed = lassoedSet.has(node.id);

          return (
            <g key={node.id} transform={`translate(${x},${y})`}>
              <g className="patch-node" style={{ animationDelay: `${depth * RING_MS}ms` }}>
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.title} — ${node.status}, ${node.disposition}`}
                  aria-pressed={isSelected}
                  style={{ cursor: "pointer", outline: "none" }}
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onSelect(isSelected ? null : node.id);
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      onSelect(isSelected ? null : node.id);
                    }
                  }}
                >
                  {(isSelected || isLassoed) && (
                    <circle
                      r={RING_R + 8}
                      fill="none"
                      stroke={isSelected ? "#ffffff" : HEALED_COLOR}
                      strokeWidth={isSelected ? 2 : 2.5}
                      strokeDasharray={isSelected ? undefined : "5 4"}
                      opacity={isSelected ? 0.9 : 0.85}
                    />
                  )}

                  {/* Disposition ring — absent for `editable`, and that absence means something */}
                  {ring && <circle r={RING_R} fill="none" stroke={ring} strokeWidth={2.5} />}

                  <circle
                    r={NODE_R + 9}
                    fill={fill}
                    opacity={0.16}
                    style={{ transition: "fill 600ms ease" }}
                  />
                  <circle
                    r={NODE_R}
                    fill={fill}
                    opacity={0.92}
                    filter="url(#patch-glow)"
                    style={{ transition: "fill 600ms ease" }}
                  />
                  <circle r={NODE_R} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1} />

                  {node.requiresHumanReview && !isHealed && (
                    <g transform={`translate(${RING_R * 0.72},${-RING_R * 0.72})`}>
                      <circle r={7} fill={REVIEW_COLOR} stroke="#0a0a0f" strokeWidth={2} />
                      <text
                        textAnchor="middle"
                        dy={3.5}
                        fontSize={9}
                        fontWeight={700}
                        fill="#0a0a0f"
                      >
                        !
                      </text>
                    </g>
                  )}

                  {/* Approved, but not yet written to the workspace (ADR-0011). */}
                  {unconfirmedSet.has(node.id) && (
                    <g transform={`translate(${RING_R * 0.72},${RING_R * 0.72})`}>
                      <circle
                        r={7}
                        fill="#3f3f46"
                        stroke="#0a0a0f"
                        strokeWidth={2}
                        opacity={0.95}
                      />
                      <circle r={2.5} fill="rgba(255,255,255,0.55)" />
                    </g>
                  )}

                  <text
                    textAnchor="middle"
                    dy={RING_R + 22}
                    fontSize={12.5}
                    fontWeight={600}
                    fill="rgba(255,255,255,0.88)"
                  >
                    {short(node.title)}
                  </text>
                  <text
                    textAnchor="middle"
                    dy={RING_R + 38}
                    fontSize={11}
                    fill="rgba(255,255,255,0.40)"
                  >
                    {node.kind.replace(/_/g, " ")} · {Math.round(node.confidence * 100)}%
                  </text>
                </g>
              </g>
            </g>
          );
        })}

        {/* ── The lasso itself ── */}
        {drag && movedRef.current && (
          <rect
            x={Math.min(drag.x0, drag.x1)}
            y={Math.min(drag.y0, drag.y1)}
            width={Math.abs(drag.x1 - drag.x0)}
            height={Math.abs(drag.y1 - drag.y0)}
            fill="rgba(16,185,129,0.08)"
            stroke={HEALED_COLOR}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        )}
      </svg>

      <MapLegend />
    </div>
  );
}
