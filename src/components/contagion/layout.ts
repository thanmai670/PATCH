import type { InfectionReport, InfectionNode } from "@/contract";

/**
 * Radial tree layout for the Contagion View (ADR-0007).
 *
 * Radius is depth in the `dependsOn` graph from Patient Zero. Angle is allocated by
 * SECTOR: each branch gets a share of the circle proportional to how much of the
 * infection hangs off it, so a lopsided graph still fills the stage evenly instead
 * of piling every descendant above the centre.
 *
 * Content is produced in its own coordinate space; the component fits that box to
 * whatever the viewport actually is. Hand-rolled because the ignite wave is the
 * point — see the ADR.
 */

export const CX = 0;
export const CY = 0;

const RADII = [0, 135, 225, 300, 365];

/**
 * The stage is much wider than it is tall, so a circular layout fits by height and
 * strands a third of the screen. Rings are ellipses: positions stretch horizontally,
 * node sizes do not.
 */
export const X_STRETCH = 2.0;

/** Each ring ignites this long after the ring inside it. */
export const RING_MS = 450;

export type PlacedNode = {
  node: InfectionNode;
  depth: number;
  angle: number;
  x: number;
  y: number;
};

export type PlacedEdge = {
  id: string;
  /** The node this edge feeds. Never re-derive this by splitting `id`. */
  toId: string;
  /** The node it came from, or null when the fact came straight from the centre. */
  fromId: string | null;
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Trust of the *child* — matchKind drives the stroke (ADR-0008). */
  matchKind: InfectionNode["matchKind"];
  /** The edge finishes drawing exactly as its target node ignites. */
  depth: number;
};

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export type Layout = {
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  maxDepth: number;
  /** Distinct ring radii in use, for the orbit guides. */
  radii: number[];
  /** The drawing's extent, already padded for labels. */
  bounds: Bounds;
};

export type Fit = { tx: number; ty: number; scale: number };

/** Viewport coordinates → content coordinates, undoing a `Fit`. */
export function toContent(fit: Fit, p: { x: number; y: number }) {
  return { x: (p.x - fit.tx) / fit.scale, y: (p.y - fit.ty) / fit.scale };
}

/** Fit a padded content box into a viewport, leaving room for the legend. */
export function fitBounds(
  bounds: Bounds,
  view: { w: number; h: number },
  pad = { left: 24, right: 24, top: 40, bottom: 20 },
): Fit {
  const availW = Math.max(1, view.w - pad.left - pad.right);
  const availH = Math.max(1, view.h - pad.top - pad.bottom);
  const bw = Math.max(1, bounds.maxX - bounds.minX);
  const bh = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(availW / bw, availH / bh);
  return {
    scale,
    tx: pad.left + (availW - bw * scale) / 2 - bounds.minX * scale,
    ty: pad.top + (availH - bh * scale) / 2 - bounds.minY * scale,
  };
}

/** Depth of every node: one more than the deepest thing it depends on. */
function computeDepths(nodes: InfectionNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depths = new Map<string, number>();

  const resolve = (id: string, seen: Set<string>): number => {
    const cached = depths.get(id);
    if (cached !== undefined) return cached;
    const node = byId.get(id);
    // A dependency we were never sent hangs off the centre rather than vanishing.
    if (!node) return 1;
    // A cycle: break it WITHOUT caching, so the depth we store does not depend on
    // which node the outer loop happened to reach first.
    if (seen.has(id)) return 1;

    seen.add(id);
    const parents = node.dependsOn.filter((p) => p !== id && byId.has(p));
    const depth =
      parents.length === 0 ? 1 : Math.max(...parents.map((p) => resolve(p, seen))) + 1;
    seen.delete(id);

    depths.set(id, depth);
    return depth;
  };

  for (const n of nodes) resolve(n.id, new Set());
  return depths;
}

export function layoutReport(report: InfectionReport): Layout {
  const nodes = report.nodes;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depths = computeDepths(nodes);
  const depthOf = (id: string) => depths.get(id) ?? 1;

  const maxDepth = nodes.reduce((m, n) => Math.max(m, depthOf(n.id)), 1);

  /** The parent a node visually hangs from: its first dependency one ring in. */
  const parentOf = new Map<string, string>();
  for (const n of nodes) {
    const parent = n.dependsOn.find(
      (p) => p !== n.id && byId.has(p) && depthOf(p) === depthOf(n.id) - 1,
    );
    if (parent) parentOf.set(n.id, parent);
  }

  const childrenOf = new Map<string, InfectionNode[]>();
  for (const n of nodes) {
    const parent = parentOf.get(n.id);
    if (!parent) continue;
    const list = childrenOf.get(parent) ?? [];
    list.push(n);
    childrenOf.set(parent, list);
  }

  /** How much of the circle a branch deserves: its number of leaves. */
  const weightCache = new Map<string, number>();
  function weight(id: string): number {
    const cached = weightCache.get(id);
    if (cached !== undefined) return cached;
    weightCache.set(id, 1); // guards cycles while recursing
    const kids = childrenOf.get(id) ?? [];
    const w = kids.length === 0 ? 1 : kids.reduce((sum, k) => sum + weight(k.id), 0);
    weightCache.set(id, w);
    return w;
  }

  const angles = new Map<string, number>();

  /** Give each child a slice of its parent's sector, sized by its own weight. */
  function assign(id: string, start: number, span: number) {
    angles.set(id, start + span / 2);
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) return;
    const total = kids.reduce((sum, k) => sum + weight(k.id), 0) || 1;
    // Children fan across their parent's sector, narrowed so siblings of different
    // branches never touch.
    const usable = span * 0.82;
    let cursor = start + (span - usable) / 2;
    for (const k of kids) {
      const kidSpan = (weight(k.id) / total) * usable;
      assign(k.id, cursor, kidSpan);
      cursor += kidSpan;
    }
  }

  const roots = nodes.filter((n) => depthOf(n.id) === 1);
  const rootTotal = roots.reduce((sum, r) => sum + weight(r.id), 0) || 1;
  let cursor = -Math.PI / 2; // first branch starts at the top
  for (const r of roots) {
    const span = (weight(r.id) / rootTotal) * 2 * Math.PI;
    assign(r.id, cursor, span);
    cursor += span;
  }

  const radiusFor = (d: number) =>
    RADII[Math.min(d, RADII.length - 1)] + Math.max(0, d - (RADII.length - 1)) * 70;

  const placed = new Map<string, PlacedNode>();
  for (const n of nodes) {
    const depth = depthOf(n.id);
    const angle = angles.get(n.id) ?? -Math.PI / 2;
    const r = radiusFor(depth);
    placed.set(n.id, {
      node: n,
      depth,
      angle,
      x: CX + r * X_STRETCH * Math.cos(angle),
      y: CY + r * Math.sin(angle),
    });
  }

  const edges: PlacedEdge[] = [];
  for (const p of placed.values()) {
    const parent = parentOf.get(p.node.id);
    const from = parent ? placed.get(parent) : undefined;
    edges.push({
      id: `${parent ?? "centre"}->${p.node.id}`,
      toId: p.node.id,
      fromId: parent ?? null,
      from: from ? { x: from.x, y: from.y } : { x: CX, y: CY },
      to: { x: p.x, y: p.y },
      matchKind: p.node.matchKind,
      depth: p.depth,
    });
  }

  const laid = [...placed.values()].sort((a, b) => a.depth - b.depth);

  // Room for the two label lines that hang below every node, and for Patient Zero's.
  const PAD_SIDE = 116;
  const PAD_TOP = 58;
  const PAD_BOTTOM = 96;

  const xs = [CX, ...laid.map((n) => n.x)];
  const ys = [CY, ...laid.map((n) => n.y)];

  return {
    nodes: laid,
    edges,
    maxDepth,
    radii: [...new Set(laid.map((n) => radiusFor(n.depth)))].sort((a, b) => a - b),
    bounds: {
      minX: Math.min(...xs) - PAD_SIDE,
      maxX: Math.max(...xs) + PAD_SIDE,
      minY: Math.min(...ys) - PAD_TOP,
      maxY: Math.max(...ys) + PAD_BOTTOM,
    },
  };
}
