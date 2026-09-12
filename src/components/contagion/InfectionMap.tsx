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
import { ArtefactIcon } from "./ArtefactIcon";
import { BandageGlyph } from "./Bandage";
import {
  KIND_LABEL,
  TONE_COLOR,
  plainAction,
  plainMatch,
  plainStatus,
  plainWhy,
} from "./plainLanguage";

const NODE_R = 30;
const RING_R = 40;
const DRAG_THRESHOLD = 6;

export type LassoResult = { safe: string[]; excluded: string[] };

type Props = {
  report: InfectionReport;
  selectedId: string | null;
  hoveredId: string | null;
  lassoed: string[];
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onLasso: (result: LassoResult) => void;
  healed?: string[];
  unconfirmed?: string[];
};

/**
 * Two lines, broken between words. A label that has to stop stops after a whole word
 * and takes an ellipsis — cutting mid-word ("Commercial Proposa…") reads as broken
 * rather than abbreviated, and the full title is always in the list on the left.
 */
function wrapLabel(title: string, perLine = 24, maxLines = 2): string[] {
  const words = title.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  let i = 0;

  for (; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (next.length <= perLine) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (lines.length === maxLines) break;
    // A single word longer than the line still has to go somewhere.
    line = words[i].length > perLine ? `${words[i].slice(0, perLine - 1)}…` : words[i];
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
    i++;
  }
  if (i < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1]}…`;
  }
  return lines;
}

/** A gentle bow, so a web of straight sticks reads as something that travelled. */
function arc(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { d: string; len: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = 0.1;
  const cx = (from.x + to.x) / 2 - dy * bow;
  const cy = (from.y + to.y) / 2 + dx * bow;
  return {
    d: `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`,
    len: len * 1.05,
  };
}

type Nudge = Record<string, { dx: number; dy: number }>;

export function InfectionMap({
  report,
  selectedId,
  hoveredId,
  lassoed,
  onSelect,
  onHover,
  onLasso,
  healed = [],
  unconfirmed = [],
}: Props) {
  const { nodes, edges, radii, bounds } = useMemo(() => layoutReport(report), [report]);

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

  /** Where the reader has dragged each artefact, relative to where PATCH put it. */
  const [nudge, setNudge] = useState<Nudge>({});
  const placed = useMemo(
    () =>
      nodes.map((n) => {
        const d = nudge[n.node.id];
        return d ? { ...n, x: n.x + d.dx, y: n.y + d.dy } : n;
      }),
    [nodes, nudge],
  );
  const byId = useMemo(() => new Map(placed.map((n) => [n.node.id, n])), [placed]);

  const healedSet = useMemo(() => new Set(healed), [healed]);
  const lassoedSet = useMemo(() => new Set(lassoed), [lassoed]);
  const unconfirmedSet = useMemo(() => new Set(unconfirmed), [unconfirmed]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [lasso, setLasso] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );
  const [moving, setMoving] = useState<{
    id: string;
    from: { x: number; y: number };
    base: { dx: number; dy: number };
  } | null>(null);
  const movedRef = useRef(false);

  /**
   * Content-space bounds of what is actually on screen. Margins are in content units
   * too — the disc needs clearance on every side, and the two label lines hang below
   * it, so the bottom needs more. Drop anything anywhere inside this and it stays
   * fully visible.
   */
  const reach = useMemo(() => {
    const clear = RING_R + 16;
    const labelDrop = RING_R + 26 + 2 * 17 + 14;
    return {
      minX: (0 - fit.tx) / fit.scale + clear,
      maxX: (view.w - fit.tx) / fit.scale - clear,
      minY: (0 - fit.ty) / fit.scale + clear,
      maxY: (view.h - fit.ty) / fit.scale - labelDrop,
    };
  }, [fit, view]);

  function toView(ev: React.PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return toContent(fit, { x: pt.x, y: pt.y });
  }

  /* ── Dragging one artefact out of the way ─────────────────────────────────── */

  function startMove(ev: React.PointerEvent, id: string) {
    ev.stopPropagation();
    const p = toView(ev);
    if (!p) return;
    movedRef.current = false;
    setMoving({ id, from: p, base: nudge[id] ?? { dx: 0, dy: 0 } });
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  }

  /* ── Dragging across empty space to pick several up at once ───────────────── */

  function onPointerDown(ev: React.PointerEvent<SVGSVGElement>) {
    const p = toView(ev);
    if (!p) return;
    movedRef.current = false;
    setLasso({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    ev.currentTarget.setPointerCapture(ev.pointerId);
  }

  function onPointerMove(ev: React.PointerEvent<SVGSVGElement>) {
    const p = toView(ev);
    if (!p) return;

    if (moving) {
      if (Math.hypot(p.x - moving.from.x, p.y - moving.from.y) > DRAG_THRESHOLD) {
        movedRef.current = true;
      }
      const home = nodes.find((n) => n.node.id === moving.id);
      if (!home) return;
      const wantX = home.x + moving.base.dx + (p.x - moving.from.x);
      const wantY = home.y + moving.base.dy + (p.y - moving.from.y);
      setNudge((n) => ({
        ...n,
        [moving.id]: {
          dx: Math.min(Math.max(wantX, reach.minX), reach.maxX) - home.x,
          dy: Math.min(Math.max(wantY, reach.minY), reach.maxY) - home.y,
        },
      }));
      return;
    }

    if (!lasso) return;
    if (Math.hypot(p.x - lasso.x0, p.y - lasso.y0) > DRAG_THRESHOLD) movedRef.current = true;
    setLasso({ ...lasso, x1: p.x, y1: p.y });
  }

  function onPointerUp(ev: React.PointerEvent<SVGSVGElement>) {
    ev.currentTarget.releasePointerCapture?.(ev.pointerId);

    if (moving) {
      const id = moving.id;
      const dragged = movedRef.current;
      setMoving(null);
      // A press that never moved is a click on that artefact.
      if (!dragged) onSelect(selectedId === id ? null : id);
      return;
    }

    if (!lasso) return;
    if (!movedRef.current) {
      setLasso(null);
      onSelect(null);
      return;
    }

    const lo = { x: Math.min(lasso.x0, lasso.x1), y: Math.min(lasso.y0, lasso.y1) };
    const hi = { x: Math.max(lasso.x0, lasso.x1), y: Math.max(lasso.y0, lasso.y1) };
    const inside = placed.filter(
      ({ x, y }) => x >= lo.x && x <= hi.x && y >= lo.y && y <= hi.y,
    );

    // ADR-0010: the lasso resolves to the Safe Set, and says what it left out.
    onLasso({
      safe: inside.filter((n) => isSafe(n.node)).map((n) => n.node.id),
      excluded: inside.filter((n) => !isSafe(n.node)).map((n) => n.node.id),
    });
    setLasso(null);
  }

  /** Every edge on the route from the centre to the artefact in focus. */
  const trail = useMemo(() => {
    const focus = hoveredId ?? selectedId;
    if (!focus) return new Set<string>();
    const parentOf = new Map(edges.map((e) => [e.toId, e.fromId]));
    const chain = new Set<string>();
    let at: string | null = focus;
    const guard = new Set<string>();
    while (at && !guard.has(at)) {
      guard.add(at);
      chain.add(at);
      at = parentOf.get(at) ?? null;
    }
    return chain;
  }, [edges, hoveredId, selectedId]);

  const hovered = hoveredId ? byId.get(hoveredId) : undefined;

  return (
    <div ref={wrapRef} className="patch-stage relative h-full w-full overflow-hidden">
      <p className="pointer-events-none absolute inset-x-0 top-3 z-10 text-center text-[12.5px] text-ink-3">
        How far the change travelled — the centre is where it was flagged, each ring out
        is one step further
      </p>

      {Object.keys(nudge).length > 0 && (
        <button
          type="button"
          onClick={() => setNudge({})}
          className="absolute left-4 top-3 z-10 rounded-md border border-rule bg-surface px-2.5 py-1 text-[12px] text-ink-2 shadow-panel hover:bg-sunk"
        >
          Put them back
        </button>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none"
        aria-label={`How the change spread: ${placed.length} affected things`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          setLasso(null);
          setMoving(null);
        }}
      >
        <defs>
          <radialGradient id="patch-sheen" cx="34%" cy="26%" r="78%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
            <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
          </radialGradient>
          <filter id="patch-lift" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="4"
              floodColor="rgb(var(--shadow-ink))"
              floodOpacity="var(--shadow-strength)"
            />
          </filter>
        </defs>

        <g transform={`translate(${fit.tx},${fit.ty}) scale(${fit.scale})`}>
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
                stroke="rgb(var(--map-orbit))"
                strokeWidth={1}
                strokeDasharray="1 7"
                opacity={0.95}
                style={{ animationDelay: `${i * RING_MS}ms` }}
              />
            ))}
          </g>

          {/* ── How the fact travelled. matchKind is on the edge (ADR-0008). ── */}
          <g>
            {edges.map((e) => {
              const target = byId.get(e.toId);
              const source = e.fromId ? byId.get(e.fromId) : undefined;
              const from = source ? { x: source.x, y: source.y } : { x: CX, y: CY };
              const to = target ? { x: target.x, y: target.y } : e.to;
              const { d, len } = arc(from, to);
              const streak = healedSet.has(e.toId)
                ? HEALED_COLOR
                : target
                  ? STATUS_COLOR[target.node.status]
                  : STATUS_COLOR.infected;
              const delay = (e.depth - 1) * RING_MS;
              const lit = trail.has(e.toId);
              return (
                <g key={e.id} pointerEvents="none">
                  <path
                    className="patch-line"
                    d={d}
                    fill="none"
                    stroke={lit ? streak : "rgb(var(--map-edge))"}
                    strokeWidth={lit ? 2.6 : 1.5}
                    strokeDasharray={MATCH_DASH[e.matchKind]}
                    strokeLinecap="round"
                    opacity={lit ? 1 : 0.75}
                    style={{
                      animationDelay: `${delay + 200}ms`,
                      transition: "stroke 200ms ease, stroke-width 200ms ease",
                    }}
                  />
                  <path
                    className="patch-edge"
                    d={d}
                    fill="none"
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

          {/* ── Where it started. An origin, never a target — never repaired. ── */}
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
              fill="rgb(var(--surface))"
              stroke={STATUS_COLOR.infected}
              strokeWidth={3}
              filter="url(#patch-lift)"
            />
            <BandageGlyph size={40} />
            <text textAnchor="middle" dy={76} fontSize={14} fontWeight={600} fill="rgb(var(--ink))">
              Someone flagged it here
            </text>
            <text textAnchor="middle" dy={96} fontSize={13} fill="rgb(var(--ink-3))">
              {report.change.patientZero?.channel ?? "Flagged in the app"}
            </text>
          </g>

          {/* ── The things it reached ── */}
          {placed.map(({ node, x, y, depth }) => {
            const isHealed = healedSet.has(node.id);
            const flat = isHealed ? HEALED_COLOR : STATUS_COLOR[node.status];
            const edge = isHealed ? HEALED_COLOR : STATUS_DEEP[node.status];
            const ring = DISPOSITION_RING[node.disposition];
            const isSelected = selectedId === node.id;
            const isHovered = hoveredId === node.id;
            const isLassoed = lassoedSet.has(node.id);
            const status = plainStatus(node);
            const lines = wrapLabel(node.title);

            return (
              <g
                key={node.id}
                className={moving?.id === node.id ? undefined : "patch-settle"}
                transform={`translate(${x},${y})`}
              >
                <g
                  className="patch-node"
                  style={{ animationDelay: `${depth * RING_MS}ms` }}
                >
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.title}. ${KIND_LABEL[node.kind]}. ${status.label}.`}
                    aria-pressed={isSelected}
                    style={{ cursor: moving?.id === node.id ? "grabbing" : "grab", outline: "none" }}
                    onPointerDown={(ev) => startMove(ev, node.id)}
                    onPointerEnter={() => onHover(node.id)}
                    onPointerLeave={() => onHover(null)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        onSelect(isSelected ? null : node.id);
                      }
                    }}
                  >
                    {(isSelected || isLassoed || isHovered) && (
                      <circle
                        r={RING_R + 11}
                        fill="none"
                        stroke={
                          isSelected ? "rgb(var(--ink))" : isLassoed ? HEALED_COLOR : "rgb(var(--map-halo))"
                        }
                        strokeWidth={isSelected ? 2 : isLassoed ? 3 : 1.5}
                        strokeDasharray={isLassoed ? "6 5" : undefined}
                      />
                    )}

                    {/* Ring only when we may NOT edit it — absence is the signal */}
                    {ring && <circle r={RING_R} fill="none" stroke={ring} strokeWidth={3} />}

                    <circle
                      r={NODE_R + 10}
                      fill={flat}
                      opacity={isHovered || isSelected ? 0.22 : 0.13}
                      style={{ transition: "opacity 200ms ease" }}
                    />
                    <circle
                      r={NODE_R}
                      fill={flat}
                      stroke={edge}
                      strokeWidth={1.5}
                      filter="url(#patch-lift)"
                      style={{ transition: "fill 600ms ease, stroke 600ms ease" }}
                    />
                    <circle r={NODE_R} fill="url(#patch-sheen)" pointerEvents="none" />
                    <ArtefactIcon kind={node.kind} size={26} color="rgb(var(--map-disc-ink))" />

                    {node.requiresHumanReview && !isHealed && (
                      <g transform={`translate(${RING_R * 0.72},${-RING_R * 0.72})`}>
                        <circle r={9} fill="rgb(var(--surface))" stroke={REVIEW_COLOR} strokeWidth={2.5} />
                        <text
                          textAnchor="middle"
                          dy={4}
                          fontSize={11}
                          fontWeight={700}
                          fill="rgb(var(--c-exposed-deep))"
                        >
                          !
                        </text>
                      </g>
                    )}

                    {unconfirmedSet.has(node.id) && (
                      <g transform={`translate(${RING_R * 0.72},${RING_R * 0.72})`}>
                        <circle r={9} fill="rgb(var(--surface))" stroke="rgb(var(--ink-3))" strokeWidth={2} />
                        <circle r={3} fill="rgb(var(--ink-3))" />
                      </g>
                    )}

                    {lines.map((line, i) => (
                      <text
                        key={i}
                        textAnchor="middle"
                        dy={RING_R + 26 + i * 17}
                        fontSize={13.5}
                        fontWeight={600}
                        fill="rgb(var(--ink))"
                      >
                        {line}
                      </text>
                    ))}
                    <text
                      textAnchor="middle"
                      dy={RING_R + 26 + lines.length * 17 + 2}
                      fontSize={12}
                      fontWeight={500}
                      fill={isHealed ? "rgb(var(--c-immune-deep))" : TONE_COLOR[status.tone].dot}
                    >
                      {isHealed ? "Repair approved" : status.label}
                    </text>
                  </g>
                </g>
              </g>
            );
          })}

          {lasso && movedRef.current && !moving && (
            <rect
              x={Math.min(lasso.x0, lasso.x1)}
              y={Math.min(lasso.y0, lasso.y1)}
              width={Math.abs(lasso.x1 - lasso.x0)}
              height={Math.abs(lasso.y1 - lasso.y0)}
              fill="rgb(var(--c-immune) / 0.12)"
              stroke={HEALED_COLOR}
              strokeWidth={2}
              strokeDasharray="7 5"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {/* ── Hovering anything explains it, so nothing needs decoding ── */}
      {hovered && !moving && !lasso && (() => {
        // Sit on the far side of the artefact from the centre, so the card never
        // covers the route the fact travelled to reach it.
        const W = 244;
        const H = 168;
        const M = 10;
        const gap = RING_R * fit.scale + 16;
        const sx = fit.tx + hovered.x * fit.scale;
        const sy = fit.ty + hovered.y * fit.scale;
        const clamp = (v: number, lo: number, hi: number) =>
          Math.min(Math.max(v, lo), Math.max(lo, hi));

        const fitsRight = sx + gap + W + M <= view.w;
        const fitsLeft = sx - gap - W - M >= 0;
        const outward = hovered.x - CX >= 0;

        let left: number;
        let top: number;
        if (outward ? fitsRight : fitsLeft) {
          left = outward ? sx + gap : sx - gap - W;
          top = clamp(sy - 54, M, view.h - H - M);
        } else if (fitsRight || fitsLeft) {
          left = fitsRight ? sx + gap : sx - gap - W;
          top = clamp(sy - 54, M, view.h - H - M);
        } else {
          // No room either side — go above or below instead of sitting on top of it.
          left = clamp(sx - W / 2, M, view.w - W - M);
          top = sy + gap + H + M <= view.h ? sy + gap : Math.max(M, sy - gap - H);
        }

        return (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-rule bg-surface p-3 shadow-panel"
            style={{ left, top, width: W }}
          >
            <p className="text-[11.5px] text-ink-3">{KIND_LABEL[hovered.node.kind]}</p>
            <p className="mt-0.5 text-[13px] font-semibold leading-tight text-ink">
              {hovered.node.title}
            </p>
            <p className="mt-1.5 text-[12px] leading-snug text-ink-2">
              {plainWhy(hovered.node, report.change)}
            </p>
            <p className="mt-2 border-t border-rule pt-2 text-[12px] leading-snug text-ink">
              {plainAction(hovered.node)}
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-ink-3">
              {plainMatch(hovered.node)}, {Math.round(hovered.node.confidence * 100)}% sure
            </p>
          </div>
        );
      })()}
    </div>
  );
}
