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

export type AmbiguousDoc = { id: string; title: string; type: string; content?: unknown };
export const listDocs = () => get<{ data: AmbiguousDoc[] }>("/documents");
export const getDoc = (id: string) => get<AmbiguousDoc>(`/documents/${id}`);
/**
 * NOTE: documents default to `restricted`, owned by whoever created them. Seeded
 * by the agent that means a human teammate opening Docs sees nothing at all.
 * Everything the seed creates is workspace-visible on purpose.
 */
export const createDoc = (d: {
  type: "doc" | "sheet" | "slide"; title: string; content: string;
  labels?: string[]; visibility?: "restricted" | "workspace" | "link" | "public";
}) => post<AmbiguousDoc>("/documents", { visibility: "workspace", ...d });

/**
 * Verified 2026-09-12: PATCH, not POST (404).
 *
 * `workspace` visibility alone makes a document READ-ONLY for everyone else -
 * the workspace role defaults to viewer. Seeded content people are meant to edit
 * has to say `editor` explicitly, or the demo's whole premise (a human edits a
 * document and PATCH notices) cannot happen.
 */
export const setDocVisibility = (
  id: string,
  visibility: "restricted" | "workspace",
  workspaceRole: "viewer" | "commenter" | "editor" = "editor",
) => patch<unknown>(`/documents/${id}/visibility`, { visibility, workspaceRole });

/**
 * Sheets take their body as a JSON *string*, not an object: posting the object
 * fails validation with "expected string, received object".
 */
/**
 * Sheets take their body as a JSON *string* of `{ sheets: [{ name, columns, rows }] }`.
 * Posting the object fails with "expected string, received object"; posting a
 * bare {columns, rows} fails with INVALID_SHEET_CONTENT.
 */
export const createSheet = (d: {
  title: string;
  tabs: { name: string; columns: { id: string; name: string }[]; rows: Record<string, string>[] }[];
  visibility?: string;
}) => post<AmbiguousDoc>("/documents", {
  type: "sheet",
  title: d.title,
  visibility: d.visibility ?? "workspace",
  content: JSON.stringify({ sheets: d.tabs }),
});
export const updateDoc = (id: string, d: { title?: string; content?: unknown; visibility?: string }) =>
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

/* ── Wider workspace surface, used by the company seed ─────────────────────── */

export type WikiSpace = { id: string; name: string };
export const listWikiSpaces = () => get<{ data: WikiSpace[] }>("/wiki/spaces");
export const createWikiSpace = (s: { name: string; description?: string }) =>
  post<{ space?: WikiSpace; id?: string }>("/wiki/spaces", s);
export const createWikiPage = (spaceId: string, p: { title: string; content_markdown: string }) =>
  post<{ page?: { id: string }; id?: string }>(`/wiki/spaces/${spaceId}/pages`, p);

export type Calendar = { id: string; name: string };
export const listCalendars = () => get<{ data: Calendar[] }>("/calendar/calendars");
export const createEvent = (calendarId: string, e: {
  title: string; start_at: string; end_at: string; description?: string; location?: string;
}) => post<{ event?: { id: string }; id?: string }>(`/calendar/${calendarId}/events`, e);

export type Contact = { id: string; name: string };
export const listContacts = () => get<{ data: Contact[] }>("/crm/contacts");
export const createContact = (c: {
  type: "person" | "company"; name: string; email?: string; title?: string;
  company_id?: string; industry?: string; website?: string;
  custom_properties?: Record<string, unknown>;
}) => post<{ contact?: Contact; id?: string }>("/crm/contacts", c);

export const createDraft = (m: { to: string[]; subject: string; body_markdown: string }) =>
  post<{ draft?: { id: string }; id?: string }>("/mail/drafts", m);
export const listDrafts = () => get<{ data: { id: string; subject: string }[] }>("/mail/drafts");

/** POST shapes are inconsistent across modules; unwrap whatever came back. */
export const idOf = (r: unknown): string => {
  const o = r as Record<string, any>;
  return String(o?.id ?? o?.task?.id ?? o?.deal?.id ?? o?.contact?.id ?? o?.page?.id ?? o?.space?.id ?? o?.event?.id ?? o?.draft?.id ?? "");
};

/* ── Workspace chat, so PATCH can speak where the work happens ─────────────── */

export type ChatChannel = { id: string; name: string; type: string };
/** Verified 2026-09-12: it is /api/channels, not /api/chat/channels (404). */
export const listChatChannels = () => get<{ data: ChatChannel[] }>("/channels");
export const sendChatMessage = (channelId: string, content: string) =>
  post<{ id: string }>(`/channels/${channelId}/messages`, { content });
