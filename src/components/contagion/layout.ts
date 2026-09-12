import type { InfectionReport, InfectionNode } from "@/contract";

/**
 * Radial layout for the Contagion View (ADR-0007).
 *
 * Radius is depth in the `dependsOn` graph from Patient Zero; angle fans children
 * around their parent so the picture reads as spread rather than as a ring of
 * unrelated things. Hand-rolled because the ignite wave is the point — see the ADR.
 */

export const VIEW_W = 1000;
export const VIEW_H = 720;
export const CX = VIEW_W / 2;
export const CY = VIEW_H / 2;

/** Ring radii by depth. Depth 0 is Patient Zero at the centre. */
const RADII = [0, 150, 250, 340, 420];

/** Each ring ignites this long after the ring inside it. */
export const RING_MS = 450;

export type PlacedNode = {
  node: InfectionNode;
  depth: number;
  angle: number; // radians
  x: number;
  y: number;
};

export type PlacedEdge = {
  id: string;
  /** The node this edge feeds. Never re-derive this by splitting `id`. */
  toId: string;
  /** null source means the edge comes from Patient Zero. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Trust of the *child* — matchKind drives the stroke (ADR-0008). */
  matchKind: InfectionNode["matchKind"];
  /** The edge finishes drawing exactly as its target node ignites. */
  depth: number;
};

export type Layout = {
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  maxDepth: number;
};

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
    // A cycle: break it here WITHOUT caching, so the depth we eventually store for
    // this node does not depend on which node the outer loop happened to reach first.
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

  const angles = new Map<string, number>();
  const placed = new Map<string, PlacedNode>();

  const radiusFor = (d: number) =>
    RADII[Math.min(d, RADII.length - 1)] + Math.max(0, d - (RADII.length - 1)) * 80;

  const maxDepth = nodes.reduce((m, n) => Math.max(m, depths.get(n.id) ?? 1), 1);

  for (let depth = 1; depth <= maxDepth; depth++) {
    const ring = nodes.filter((n) => depths.get(n.id) === depth);

    if (depth === 1) {
      // Evenly around the circle, first node at the top.
      ring.forEach((n, i) => {
        angles.set(n.id, -Math.PI / 2 + (i * 2 * Math.PI) / ring.length);
      });
    } else {
      // Fan each group of siblings around the angle of the parent they spread from.
      const groups = new Map<string, InfectionNode[]>();
      for (const n of ring) {
        const parent =
          n.dependsOn.find((p) => byId.has(p) && angles.has(p)) ?? "__centre__";
        const list = groups.get(parent) ?? [];
        list.push(n);
        groups.set(parent, list);
      }
      for (const [parentId, siblings] of groups) {
        const base = angles.get(parentId) ?? -Math.PI / 2;
        const spread = Math.min(Math.PI / 6, Math.PI / (siblings.length + 1));
        siblings.forEach((n, i) => {
          const offset =
            siblings.length === 1
              ? 0
              : (i - (siblings.length - 1) / 2) * spread * 2;
          angles.set(n.id, base + offset);
        });
      }
    }

    for (const n of ring) {
      const angle = angles.get(n.id)!;
      const r = radiusFor(depth);
      placed.set(n.id, {
        node: n,
        depth,
        angle,
        x: CX + r * Math.cos(angle),
        y: CY + r * Math.sin(angle),
      });
    }
  }

  const edges: PlacedEdge[] = [];
  for (const p of placed.values()) {
    const parents = p.node.dependsOn.filter(
      (id) => id !== p.node.id && placed.has(id),
    );
    if (parents.length === 0) {
      edges.push({
        id: `centre->${p.node.id}`,
        toId: p.node.id,
        from: { x: CX, y: CY },
        to: { x: p.x, y: p.y },
        matchKind: p.node.matchKind,
        depth: p.depth,
      });
    } else {
      for (const parentId of parents) {
        const parent = placed.get(parentId)!;
        edges.push({
          id: `${parentId}->${p.node.id}`,
          toId: p.node.id,
          from: { x: parent.x, y: parent.y },
          to: { x: p.x, y: p.y },
          matchKind: p.node.matchKind,
          depth: p.depth,
        });
      }
    }
  }

  return {
    nodes: [...placed.values()].sort((a, b) => a.depth - b.depth),
    edges,
    maxDepth,
  };
}
