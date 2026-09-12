/**
 * `InfectionNode.surfaceProps` is `Record<string, unknown>` in the frozen contract
 * because its shape depends on `surface` (see docs/ARCHITECTURE.md). These readers
 * are the one place that fact is absorbed: a planner agent sending a missing or
 * mistyped key degrades the surface, it never blanks the screen.
 */
export type SurfaceProps = Record<string, unknown>;

export function str(p: SurfaceProps, key: string, fallback = ""): string {
  const v = p[key];
  return typeof v === "string" ? v : fallback;
}

export function num(p: SurfaceProps, key: string, fallback = 0): number {
  const v = p[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function strList(p: SurfaceProps, key: string): string[] {
  const v = p[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Which controls the planner offered for this artefact. */
export function actions(p: SurfaceProps): string[] {
  return strList(p, "actions");
}

export function optional(p: SurfaceProps, key: string): string | null {
  const v = p[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}
