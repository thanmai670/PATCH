import { search, scanDealsFor, getDoc, type SearchHit } from "@/adapters/ambiguous";
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
  const subjectHits = { data: subjectResults.flatMap((r) => r.data ?? []) };

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

  await enrich(candidates, change.previousValue);

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
