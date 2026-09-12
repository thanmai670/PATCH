import { search, scanDealsFor, getDoc, listSent, listDrafts, type SearchHit } from "@/adapters/ambiguous";
import type { TruthChange, AgentTraceEntry } from "@/contract";

export type Candidate = {
  ambiguousId: string;
  module: string;
  title: string;
  snippet: string;
  /** How we found it — feeds the classifier's matchKind, it does not decide it. */
  /** literal hit on the old value | about the changed subject | CRM field scan */
  foundBy: "search" | "subject_search" | "crm_field_scan";
  field?: string;
};

/**
 * Find every workspace artefact that may carry the stale fact.
 *
 * Deliberately NOT an LLM call. This is retrieval, and the two sources below are
 * mechanical. The judgement happens in the classifier.
 *
 * CRITICAL: cross-module search does not index CRM custom_properties (verified
 * 2026-09-12). A deal holding motor_rating "22 kW" never comes back from
 * search("22 kW"). Search alone silently loses the CRM node, so we scan deals too.
 */
/**
 * A mail candidate's title cannot say whether it was sent. Without this the
 * classifier guessed, and an unsent DRAFT came back "irreversible" - the exact
 * distinction the product turns on.
 */
async function markMailState(candidates: Candidate[]): Promise<void> {
  const mail = candidates.filter((c) => c.module === "Mail");
  if (mail.length === 0) return;
  try {
    const [sent, drafts] = await Promise.all([listSent(), listDrafts()]);
    const sentIds = new Set((sent.data ?? []).map((m) => m.id));
    const draftIds = new Set((drafts.data ?? []).map((m) => m.id));
    for (const c of mail) {
      if (draftIds.has(c.ambiguousId)) c.snippet = `[UNSENT DRAFT] ${c.snippet}`;
      else if (sentIds.has(c.ambiguousId)) c.snippet = `[ALREADY SENT] ${c.snippet}`;
    }
  } catch {
    /* leave unmarked; the classifier will flag for review, which is correct */
  }
}

/**
 * Search hits come back without body text, which leaves the classifier guessing from
 * titles — it then labels everything "exposed ... cannot confirm literal presence".
 * Pull the real content for document candidates and quote the line carrying the value.
 */
async function enrich(candidates: Candidate[], oldValue: string): Promise<void> {
  await Promise.all(
    candidates.map(async (c) => {
      if (c.snippet.trim() || c.module !== "Docs") return;
      try {
        const doc = await getDoc(c.ambiguousId);
        const body = String(doc.content ?? "");
        const line = body.split("\n").find((l) => l.includes(oldValue));
        c.snippet = line
          ? `…${line.trim()}…`
          : body.slice(0, 300);
      } catch {
        /* leave empty; the classifier will flag it for review, which is correct */
      }
    }),
  );
}

const STOPWORDS = new Set([
  "the", "and", "for", "from", "with", "this", "that", "new", "old", "value", "change",
  "changed", "approved", "project", "specification", "spec", "updated", "revised",
]);

/** Short, distinctive terms — Ambiguous search ANDs terms, so long queries return nothing. */
function keywords(change: { subject: string; project: string | null }): string[] {
  const words = `${change.subject} ${change.project ?? ""}`
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w.toLowerCase()));
  return [...new Set(words)].slice(0, 4);
}

export async function tracer(
  change: TruthChange,
): Promise<{ candidates: Candidate[]; trace: AgentTraceEntry }> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  // Two passes, because they find different things:
  //  - literal: artefacts CONTAINING the stale value  -> candidates for "infected"
  //  - subject: artefacts ABOUT the thing that changed -> candidates for "exposed",
  //    which by definition never contain the literal and so can never be found by the
  //    first pass. Without this the dependent-work node simply never appears.
  //
  // Ambiguous search ANDs every term (verified 2026-09-12): a whole-sentence query
  // matches nothing. Subject terms must therefore be issued as SHORT queries.
  const terms = keywords(change);
  const [hits, deals, ...subjectResults] = await Promise.all([
    search(change.previousValue),
    scanDealsFor(change.previousValue),
    ...terms.map((t) => search(t)),
  ]);
  // The subject pass exists to surface DEPENDENCIES (exposed artefacts), not to
  // drag in everything mentioning the project. Uncapped it returned ten mostly
  // irrelevant candidates, which the classifier then spent 80s marking immune.
  const SUBJECT_LIMIT = 5;
  const seen = new Set((hits.data ?? []).map((h) => String(h.id)));
  const subjectPool = [];
  for (const r of subjectResults) {
    for (const h of r.data ?? []) {
      const id = String(h.id);
      if (seen.has(id)) continue;
      seen.add(id);
      subjectPool.push(h);
      if (subjectPool.length >= SUBJECT_LIMIT) break;
    }
    if (subjectPool.length >= SUBJECT_LIMIT) break;
  }
  const subjectHits = { data: subjectPool };

  const candidates: Candidate[] = (hits.data ?? []).map((h: SearchHit) => ({
    ambiguousId: String(h.id),
    module: String(h.module ?? "unknown"),
    title: String(h.title ?? h.id),
    snippet: String(h.snippet ?? ""),
    foundBy: "search",
  }));

  for (const h of subjectHits.data ?? []) {
    if (candidates.some((c) => c.ambiguousId === String(h.id))) continue;
    candidates.push({
      ambiguousId: String(h.id),
      module: String(h.module ?? "unknown"),
      title: String(h.title ?? h.id),
      snippet: String(h.snippet ?? ""),
      foundBy: "subject_search",
    });
  }

  for (const { deal, field } of deals) {
    // The field scan carries the actual evidence, so it REPLACES a bare hit on the
    // same row rather than being skipped — otherwise the classifier sees an empty
    // snippet and can only guess "exposed".
    const dup = candidates.findIndex((c) => c.ambiguousId === deal.id);
    if (dup !== -1) candidates.splice(dup, 1);
    candidates.push({
      ambiguousId: deal.id,
      module: "CRM",
      title: deal.title,
      snippet: `${field} = ${String(deal.custom_properties?.[field] ?? "")}`,
      foundBy: "crm_field_scan",
      field,
    });
  }

  // One artefact can surface from several passes and, for wiki pages, several
  // times from one search. Duplicates cost a classifier call each and render as
  // separate nodes on the map - "Supplier Directory" appeared three times.
  const unique = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = c.ambiguousId || `${c.module}:${c.title}`;
    const seen = unique.get(key);
    // Keep the richest evidence: a literal hit beats a subject hit.
    if (!seen || (seen.foundBy === "subject_search" && c.foundBy !== "subject_search")) {
      unique.set(key, c);
    }
  }
  candidates.length = 0;
  candidates.push(...unique.values());

  await enrich(candidates, change.previousValue);
  await markMailState(candidates);

  const modules = [...new Set(candidates.map((c) => c.module))];
  return {
    candidates,
    trace: {
      agent: "tracer",
      model: "n/a (mechanical retrieval)",
      startedAt,
      durationMs: Date.now() - t0,
      summary: `Found ${candidates.length} candidate artefact(s) across ${modules.join(", ")}: ${(hits.data ?? []).length} literal, ${candidates.filter((c) => c.foundBy === "subject_search").length} by subject (possible dependencies), ${deals.length} via CRM field scan that search missed`,
      tokensIn: null,
      tokensOut: null,
    },
  };
}
