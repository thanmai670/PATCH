"use client";

import { useMemo } from "react";
import type { InfectionReport } from "@/contract";
import { layoutReport, CX, CY, VIEW_W, VIEW_H, RING_MS } from "./layout";
import {
  STATUS_COLOR,
  DISPOSITION_RING,
  MATCH_DASH,
  REVIEW_COLOR,
  HEALED_COLOR,
} from "./tokens";
import { MapLegend } from "./MapLegend";

const NODE_R = 26;
const RING_R = 35;

type Props = {
  report: InfectionReport;
  selectedId: string | null;
  lassoed: string[];
  onSelect: (id: string | null) => void;
  onLasso: (ids: string[]) => void;
  /** Nodes the human has approved. Set in B4/B5; empty during B1. */
  healed?: string[];
};

/** Keep long artefact titles from colliding with their neighbours. */
function short(title: string, max = 26) {
  return title.length <= max ? title : `${title.slice(0, max - 1)}…`;
}

export function InfectionMap({
  report,
  selectedId,
  lassoed,
  onSelect,
  healed = [],
}: Props) {
  const { nodes, edges } = useMemo(() => layoutReport(report), [report]);
  const healedSet = useMemo(() => new Set(healed), [healed]);
  const lassoedSet = useMemo(() => new Set(lassoed), [lassoed]);

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label={`Contagion map: ${nodes.length} affected artefacts`}
        onClick={() => onSelect(null)}
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
            const target = nodes.find((n) => `${n.node.id}` === e.id.split("->")[1]);
            const streak = target
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
        <g transform={`translate(${CX},${CY})`}>
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
              <g
                className="patch-node"
                style={{ animationDelay: `${depth * RING_MS}ms` }}
              >
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.title} — ${node.status}, ${node.disposition}`}
                  aria-pressed={isSelected}
                  style={{ cursor: "pointer", outline: "none" }}
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
                  {/* Selection / lasso halo */}
                  {(isSelected || isLassoed) && (
                    <circle
                      r={RING_R + 8}
                      fill="none"
                      stroke={isSelected ? "#ffffff" : HEALED_COLOR}
                      strokeWidth={isSelected ? 2 : 2.5}
                      strokeDasharray={isSelected ? undefined : "5 4"}
                      opacity={isSelected ? 0.9 : 0.8}
                    />
                  )}

                  {/* Disposition ring — absent for `editable`, and that absence means something */}
                  {ring && (
                    <circle r={RING_R} fill="none" stroke={ring} strokeWidth={2.5} />
                  )}

                  <circle r={NODE_R + 9} fill={fill} opacity={0.16} />
                  <circle
                    r={NODE_R}
                    fill={fill}
                    opacity={0.92}
                    filter="url(#patch-glow)"
                  />
                  <circle r={NODE_R} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1} />

                  {/* Needs a human before anything happens to it */}
                  {node.requiresHumanReview && (
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
      </svg>

      <MapLegend />
    </div>
  );
}
