/**
 * Exa — external evidence. WORKSTREAM A.
 *
 * Exa supplies EVIDENCE, it never decides. Every result carries a sourceStatus so the
 * UI can show live / cached / unverified, and a contradicting source is returned rather
 * than dropped (see the evidence agent).
 */
import Exa from "exa-js";
import type { Evidence } from "@/contract";

export type RawEvidence = {
  title: string;
  url: string | null;
  publishedDate: string | null;
  highlight: string;
};

/** Returns [] rather than throwing: losing external evidence must not kill the run. */
export async function findEvidence(query: string, limit = 5): Promise<{
  results: RawEvidence[];
  reachable: boolean;
}> {
  const key = process.env.EXA_API_KEY;
  if (!key) return { results: [], reachable: false };

  try {
    const exa = new Exa(key);
    const res = await exa.searchAndContents(query, {
      numResults: limit,
      highlights: { numSentences: 3, highlightsPerUrl: 2 },
      type: "auto",
    });
    return {
      reachable: true,
      results: (res.results ?? []).map((r: any) => ({
        title: r.title ?? r.url ?? "untitled",
        url: r.url ?? null,
        publishedDate: r.publishedDate ?? null,
        highlight: Array.isArray(r.highlights) ? r.highlights.join(" … ") : (r.text ?? "").slice(0, 400),
      })),
    };
  } catch {
    // Safeguard #2: source unavailable -> caller labels evidence "cached"/"unverified".
    return { results: [], reachable: false };
  }
}
