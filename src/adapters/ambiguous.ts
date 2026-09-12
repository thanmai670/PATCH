/**
 * Ambiguous workspace adapter. WORKSTREAM A.
 *
 * Base: https://app.ambiguous.ai/api    Auth: Authorization: Bearer $AMBIGUOUS_API_KEY
 *
 * Paths below are VERIFIED against the live API (probed 2026-09-12), not guessed:
 *   GET  /api/search?q=            -> { data, total, has_more, query }   ← the tracer's job
 *   GET  /api/documents            POST /api/documents      PATCH /api/documents/:id
 *   GET  /api/tasks                POST /api/tasks          PATCH /api/tasks/:id
 *   GET  /api/crm/deals            POST /api/crm/deals      PATCH /api/crm/deals/:id
 *   GET  /api/crm/contacts         POST /api/crm/contacts
 *   GET  /api/mail/inbox  /api/mail/sent  /api/mail/drafts   POST /api/mail/send
 *
 * Note: there is no /api/mail/messages (404) and search is GET with `q`, not POST.
 */
const BASE = process.env.AMBIGUOUS_BASE_URL ?? "https://app.ambiguous.ai/api";

export class AmbiguousError extends Error {
  constructor(
    readonly status: number,
    readonly method: string,
    readonly path: string,
    readonly body: string,
  ) {
    super(`Ambiguous ${method} ${path} -> ${status} ${body.slice(0, 300)}`);
    this.name = "AmbiguousError";
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.AMBIGUOUS_API_KEY;
  if (!key) throw new Error("AMBIGUOUS_API_KEY is not set (see .env.local)");

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!res.ok) throw new AmbiguousError(res.status, method, path, await res.text());
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const get = <T>(path: string) => call<T>("GET", path);
export const post = <T>(path: string, body: unknown) => call<T>("POST", path, body);
export const patch = <T>(path: string, body: unknown) => call<T>("PATCH", path, body);
export const del = <T>(path: string) => call<T>("DELETE", path);

/* ── Typed surface the agents actually use ──────────────────────────────────── */

export type SearchHit = {
  id: string;
  module: string;
  title?: string;
  snippet?: string;
  [k: string]: unknown;
};

/**
 * Cross-module search.
 *
 * CAUTION (verified 2026-09-12): this does NOT index CRM `custom_properties`.
 * A deal holding `motor_rating: "22 kW"` does not come back from search("22 kW").
 * The tracer must therefore scan CRM records directly as well — see `scanDealsFor`.
 */
export const search = (q: string, limit = 50) =>
  get<{ data: SearchHit[]; total: number; has_more: boolean; query: string }>(
    `/search?q=${encodeURIComponent(q)}&limit=${limit}`,
  );

export type AmbiguousDoc = { id: string; title: string; type: string; content?: string };
export const listDocs = () => get<{ data: AmbiguousDoc[] }>("/documents");
export const createDoc = (d: { type: "doc" | "sheet" | "slide"; title: string; content: string; labels?: string[] }) =>
  post<AmbiguousDoc>("/documents", d);
export const updateDoc = (id: string, d: { title?: string; content?: string }) =>
  patch<AmbiguousDoc>(`/documents/${id}`, d);
export const deleteDoc = (id: string) => del<void>(`/documents/${id}`);

export type AmbiguousTask = { id: string; title: string; description?: string };
export const listTasks = () => get<{ data: AmbiguousTask[] }>("/tasks");
/** NOTE: POST /api/tasks returns { task: {...} }, not the task directly. Verified 2026-09-12. */
export const createTask = async (t: {
  title: string;
  description?: string;
  priority?: "urgent" | "high" | "medium" | "low";
  status?: "todo" | "in_progress" | "done" | "cancelled" | "blocked";
}) => (await post<{ task: AmbiguousTask }>("/tasks", t)).task;
export const deleteTask = (id: string) => del<void>(`/tasks/${id}`);

export type AmbiguousDeal = {
  id: string;
  title: string;
  custom_properties?: Record<string, unknown>;
};
export const listDeals = () => get<{ data: AmbiguousDeal[] }>("/crm/deals");
/** NOTE: POST /api/crm/deals returns { deal: {...} }. POST /api/documents is flat. Verified 2026-09-12. */
export const createDeal = async (d: {
  title: string;
  amount?: number;
  currency?: string;
  custom_properties?: Record<string, unknown>;
}) => (await post<{ deal: AmbiguousDeal }>("/crm/deals", d)).deal;
export const updateDeal = (id: string, d: Partial<AmbiguousDeal>) =>
  patch<AmbiguousDeal>(`/crm/deals/${id}`, d);
export const deleteDeal = (id: string) => del<void>(`/crm/deals/${id}`);

export type AmbiguousMail = { id: string; subject: string; body_markdown?: string };
export const listSent = () => get<{ data: AmbiguousMail[] }>("/mail/sent");
export const sendMail = (m: {
  to: string[];
  subject: string;
  body_markdown: string;
}) => post<AmbiguousMail>("/mail/send", m);

/**
 * Literal scan of CRM deals' custom_properties. Covers the gap left by /search,
 * which does not index them. Returns [deal, matching field name] pairs.
 */
export async function scanDealsFor(value: string): Promise<{ deal: AmbiguousDeal; field: string }[]> {
  const { data } = await listDeals();
  const out: { deal: AmbiguousDeal; field: string }[] = [];
  for (const deal of data ?? []) {
    for (const [field, v] of Object.entries(deal.custom_properties ?? {})) {
      if (typeof v === "string" && v.includes(value)) out.push({ deal, field });
    }
  }
  return out;
}
