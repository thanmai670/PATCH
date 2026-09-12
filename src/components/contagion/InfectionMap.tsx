"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InfectionReport } from "@/contract";
import {
  layoutReport,
  toContent,
  fitBounds,
  CX,
  CY,
  RING_MS,
  X_STRETCH,
} from "./layout";
import {
  STATUS_COLOR,
  STATUS_DEEP,
  DISPOSITION_RING,
  MATCH_DASH,
  REVIEW_COLOR,
  HEALED_COLOR,
  isSafe,
} from "./tokens";

const NODE_R = 30;
const RING_R = 40;
const DRAG_THRESHOLD = 6;

export type LassoResult = { safe: string[]; excluded: string[] };

type Props = {
  report: InfectionReport;
  selectedId: string | null;
  lassoed: string[];
  onSelect: (id: string | null) => void;
  onLasso: (result: LassoResult) => void;
  healed?: string[];
  unconfirmed?: string[];
};

/**
 * Two short lines beat one long one: a wide label collides with the neighbouring
 * artefact on a radial layout, a narrow stack does not.
 */
function wrapLabel(title: string, perLine = 19, maxLines = 2): string[] {
  const words = title.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= perLine) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = w;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  const used = lines.join(" ").length;
  if (used < title.replace(/\s+/g, " ").length) {
    const last = lines[lines.length - 1] ?? "";
    lines[lines.length - 1] = `${last.slice(0, perLine - 1)}…`;
  }
  return lines;
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
  const { nodes, edges, radii, bounds } = useMemo(() => layoutReport(report), [report]);

  // The stage is wide and short; a fixed viewBox would letterbox the map into the
  // middle third of it. Measure the box and fit the drawing to what's actually there.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ w: 1100, h: 620 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setView({ w: Math.max(360, width), h: Math.max(280, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useMemo(() => fitBounds(bounds, view), [bounds, view]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.node.id, n])), [nodes]);
  const healedSet = useMemo(() => new Set(healed), [healed]);
  const lassoedSet = useMemo(() => new Set(lassoed), [lassoed]);
  const unconfirmedSet = useMemo(() => new Set(unconfirmed), [unconfirmed]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );
  const movedRef = useRef(false);

  /** Screen coordinates → content coordinates (through the fit transform). */
  function toView(ev: React.PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return toContent(fit, { x: pt.x, y: pt.y });
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
    <div ref={wrapRef} className="patch-stage relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${view.w} ${view.h}`}
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
          <filter id="patch-lift" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="4"
              floodColor="#16202B"
              floodOpacity="0.18"
            />
          </filter>
        </defs>

        <g transform={`translate(${fit.tx},${fit.ty}) scale(${fit.scale})`}>
          {/* ── Orbit guides: the rings the infection travels through ── */}
          <g pointerEvents="none">
            {radii.map((r, i) => (
              <ellipse
                key={r}
                className="patch-reveal"
                cx={CX}
                cy={CY}
                rx={r * X_STRETCH}
                ry={r}
                fill="none"
                stroke="#D5DDE5"
                strokeWidth={1}
                strokeDasharray="2 6"
                style={{ animationDelay: `${i * RING_MS}ms` }}
              />
            ))}
          </g>

          {/* ── Edges. matchKind is carried here, never on the node (ADR-0008). ── */}
          <g>
            {edges.map((e) => {
              const len = Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y);
              const target = byId.get(e.toId);
              const streak = healedSet.has(e.toId)
                ? HEALED_COLOR
                : target
                  ? STATUS_COLOR[target.node.status]
                  : STATUS_COLOR.infected;
              const delay = (e.depth - 1) * RING_MS;
              return (
                <g key={e.id} pointerEvents="none">
                  <line
                    className="patch-line"
                    x1={e.from.x}
                    y1={e.from.y}
                    x2={e.to.x}
                    y2={e.to.y}
                    stroke="#AEBAC6"
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
                    strokeWidth={4}
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
            <circle
              className="patch-shock"
              r={56}
              fill="none"
              stroke={STATUS_COLOR.infected}
              strokeWidth={9}
            />
            <circle
              className="patch-shock"
              r={56}
              fill="none"
              stroke={STATUS_COLOR.infected}
              strokeWidth={6}
              style={{ animationDelay: "760ms" }}
            />
            <circle
              r={54}
              fill="none"
              stroke={STATUS_COLOR.infected}
              strokeOpacity={0.28}
              strokeWidth={1.5}
              strokeDasharray="3 5"
            />
            <circle
              r={42}
              fill="#FFFFFF"
              stroke={STATUS_COLOR.infected}
              strokeWidth={3}
              filter="url(#patch-lift)"
            />
            <text textAnchor="middle" dy={13} fontSize={32}>
              🩹
            </text>
            <text
              textAnchor="middle"
              dy={76}
              fontSize={14}
              fontWeight={600}
              fill="#16202B"
            >
              Where it started
            </text>
            <text textAnchor="middle" dy={96} fontSize={13} fill="#828E9B">
              {report.change.patientZero?.channel ?? "Nominated in the app"}
            </text>
          </g>

          {/* ── Artefacts. Fill = status, ring = disposition (ADR-0008). ── */}
          {nodes.map(({ node, x, y, depth }) => {
            const isHealed = healedSet.has(node.id);
            const flat = isHealed ? HEALED_COLOR : STATUS_COLOR[node.status];
            const edge = isHealed ? HEALED_COLOR : STATUS_DEEP[node.status];
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
                        r={RING_R + 11}
                        fill="none"
                        stroke={isSelected ? "#16202B" : HEALED_COLOR}
                        strokeWidth={isSelected ? 2 : 3}
                        strokeDasharray={isSelected ? undefined : "6 5"}
                        opacity={isSelected ? 0.95 : 0.9}
                      />
                    )}

                    {/* Disposition ring — absent for `editable`, and that absence means something */}
                    {ring && (
                      <circle r={RING_R} fill="none" stroke={ring} strokeWidth={3} />
                    )}

                    <circle
                      r={NODE_R + 14}
                      fill={flat}
                      opacity={0.13}
                      style={{ transition: "fill 600ms ease" }}
                    />
                    <circle
                      r={NODE_R}
                      fill={flat}
                      stroke={edge}
                      strokeWidth={1.5}
                      filter="url(#patch-lift)"
                      style={{ transition: "fill 600ms ease, stroke 600ms ease" }}
                    />

                    {node.requiresHumanReview && !isHealed && (
                      <g transform={`translate(${RING_R * 0.72},${-RING_R * 0.72})`}>
                        <circle r={9} fill="#FFFFFF" stroke={REVIEW_COLOR} strokeWidth={2.5} />
                        <text
                          textAnchor="middle"
                          dy={4}
                          fontSize={11}
                          fontWeight={700}
                          fill="#9A5B06"
                        >
                          !
                        </text>
                      </g>
                    )}

                    {/* Approved, but not yet written to the workspace (ADR-0011). */}
                    {unconfirmedSet.has(node.id) && (
                      <g transform={`translate(${RING_R * 0.72},${RING_R * 0.72})`}>
                        <circle r={9} fill="#FFFFFF" stroke="#828E9B" strokeWidth={2} />
                        <circle r={3} fill="#828E9B" />
                      </g>
                    )}

                    {wrapLabel(node.title).map((line, i) => (
                      <text
                        key={i}
                        textAnchor="middle"
                        dy={RING_R + 26 + i * 17}
                        fontSize={13.5}
                        fontWeight={600}
                        fill="#16202B"
                      >
                        {line}
                      </text>
                    ))}
                    <text
                      textAnchor="middle"
                      dy={RING_R + 26 + wrapLabel(node.title).length * 17 + 2}
                      fontSize={11.5}
                      fill="#828E9B"
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
              fill="rgba(14,159,110,0.10)"
              stroke={HEALED_COLOR}
              strokeWidth={2}
              strokeDasharray="7 5"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

    </div>
  );
}
