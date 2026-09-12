/**
 * Runtime mirror of src/lib/authz.ts for the ESM listener. Same config file, same
 * rules — the TypeScript copy exists for the Next side, this one for the channel.
 */
import { readFileSync } from "node:fs";

const CONFIG_PATH = "patch.config.json";

// No config means no one can act. Failing closed is the only safe default for a
// component whose actions write to a real workspace.
const FALLBACK = {
  roles: { admin: { members: [] } },
  permissions: {
    view: "everyone",
    nominate: ["admin"], confirm: ["admin"], approve_repairs: ["admin"],
    change_models: ["admin"], dismiss: ["admin"],
  },
};

export const loadConfig = () => {
  try { return JSON.parse(readFileSync(CONFIG_PATH, "utf8")); } catch { return FALLBACK; }
};

const norm = (s) => String(s ?? "").trim().toLowerCase();

export function rolesOf(who, cfg = loadConfig()) {
  const keys = [who?.email, who?.name, who?.id].map(norm).filter(Boolean);
  if (!keys.length) return [];
  return Object.entries(cfg.roles ?? {})
    .filter(([, r]) => (r.members ?? []).some((m) => keys.includes(norm(m))))
    .map(([n]) => n);
}

export function can(who, perm, cfg = loadConfig()) {
  const rule = cfg.permissions?.[perm];
  if (rule === "everyone") return true;
  if (!Array.isArray(rule)) return false;
  const held = rolesOf(who, cfg);
  return rule.some((r) => held.includes(r));
}

export function adminsFor(perm, cfg = loadConfig()) {
  const rule = cfg.permissions?.[perm];
  if (!Array.isArray(rule)) return [];
  return [...new Set(rule.flatMap((r) => cfg.roles?.[r]?.members ?? []))];
}

export const describeRole = (who, cfg = loadConfig()) =>
  rolesOf(who, cfg).join(", ") || "viewer";

/** Identity as the channel reports it. */
export const identityOf = (evt) => ({
  id: evt?.actor?.id ?? evt?.user?.id ?? null,
  name: evt?.user?.name ?? evt?.actor?.name ?? null,
  email: evt?.actor?.email ?? null,
});
