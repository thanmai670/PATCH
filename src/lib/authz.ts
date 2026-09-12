/**
 * Who may do what with PATCH.
 *
 * The split is deliberate: VIEWING is open to everyone, ACTING is not. PATCH's
 * value is that a team can see where a stale fact spread and how it was repaired,
 * so hiding the reasoning would defeat it. But starting a workspace-wide search,
 * writing to records, or changing which model runs are all things a channel
 * member should not be able to do just by being in the channel.
 */
import { readFileSync } from "node:fs";

export type Permission =
  | "view" | "nominate" | "confirm" | "approve_repairs" | "change_models" | "dismiss";

export type Identity = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
};

type Config = {
  roles: Record<string, { description?: string; members: string[] }>;
  permissions: Record<Permission, string[] | "everyone">;
};

const CONFIG_PATH = "patch.config.json";

const FALLBACK: Config = {
  roles: { admin: { members: [] } },
  // No config means no one can act. Failing closed is the only safe default for
  // a component whose actions write to a real workspace.
  permissions: {
    view: "everyone",
    nominate: ["admin"],
    confirm: ["admin"],
    approve_repairs: ["admin"],
    change_models: ["admin"],
    dismiss: ["admin"],
  },
};

export function loadConfig(): Config {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Config;
  } catch {
    return FALLBACK;
  }
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

/** Every role this identity holds. Matched on email, display name, or id. */
export function rolesOf(who: Identity, cfg = loadConfig()): string[] {
  const keys = [who.email, who.name, who.id].map(norm).filter(Boolean);
  if (keys.length === 0) return [];
  return Object.entries(cfg.roles)
    .filter(([, r]) => (r.members ?? []).some((m) => keys.includes(norm(m))))
    .map(([name]) => name);
}

export function can(who: Identity, perm: Permission, cfg = loadConfig()): boolean {
  const rule = cfg.permissions?.[perm];
  if (rule === "everyone") return true;
  if (!Array.isArray(rule)) return false;
  const held = rolesOf(who, cfg);
  return rule.some((r) => held.includes(r));
}

/** Who to name in a refusal, so it is actionable rather than a dead end. */
export function adminsFor(perm: Permission, cfg = loadConfig()): string[] {
  const rule = cfg.permissions?.[perm];
  if (!Array.isArray(rule)) return [];
  return [...new Set(rule.flatMap((r) => cfg.roles[r]?.members ?? []))];
}

export function describe(who: Identity, cfg = loadConfig()): string {
  const held = rolesOf(who, cfg);
  return held.length ? held.join(", ") : "viewer";
}
