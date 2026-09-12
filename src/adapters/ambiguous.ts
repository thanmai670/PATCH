/**
 * Ambiguous workspace adapter. WORKSTREAM A.
 * Base: https://app.ambiguous.ai/api   Auth: Authorization: Bearer $AMBIGUOUS_API_KEY
 *
 * Endpoints confirmed:
 *   GET/POST /documents · PATCH /documents/:id · DELETE /documents/:id
 *   GET /mail/inbox · POST /mail/send · GET /mail/:id
 *   GET/POST /tasks · PATCH /tasks/:id/complete
 *   GET /crm/contacts · POST /crm/deals · PATCH /crm/deals/:id
 *   GET /drive/files · POST /drive/upload
 *   POST /search   ← the tracer's whole job
 */
const BASE = process.env.AMBIGUOUS_BASE_URL ?? "https://app.ambiguous.ai/api";

export async function ambiguous<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AMBIGUOUS_API_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Ambiguous ${init.method ?? "GET"} ${path} → ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export const search = (query: string) =>
  ambiguous<{ results: unknown[] }>("/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
