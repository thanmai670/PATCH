import { z } from "zod";
import { runAgent } from "@/lib/openrouter";
import { findEvidence } from "@/adapters/exa";
import type { TruthChange, Evidence, AgentTraceEntry } from "@/contract";

const Out = z.object({
  evidence: z.array(
    z.object({
      index: z.number(),
      supports: z.boolean(),
      relevant: z.boolean(),
      highlight: z.string(),
    }),
  ),
});

const SYSTEM = `You assess whether each retrieved source SUPPORTS or CONTRADICTS a stated change.

supports=true  : the source asserts the NEW value, or withdraws the previous one.
supports=false : the source still asserts the PREVIOUS value, or contradicts the change.
relevant=false : the source is not about THIS equipment and THIS change. Be strict.

BE RUTHLESS ABOUT RELEVANCE. A source that merely contains the same number, or shares a
word with the project codename, is NOT relevant. A product listing, a spare-parts page or
a catalogue entry for a different manufacturer's equipment is NOT relevant even when the
rating matches exactly. Marking such a source relevant puts a confident irrelevant claim
in front of a human making a repair decision, which is worse than showing nothing.

If nothing is genuinely relevant, mark everything relevant=false. "Internally confirmed
only" is an honest, designed outcome.

A contradicting source is valuable and must be reported, never suppressed — an older
catalogue still listing the old value is exactly what a human needs to see.

highlight: quote the passage that decided it, trimmed to one or two sentences.

Return ONLY JSON: {evidence: [{index, supports, relevant, highlight}]}`;

export async function evidence(
  change: TruthChange,
  extras: { sourceHint: string | null; subjectDomain: string | null } = { sourceHint: null, subjectDomain: null },
): Promise<{ evidence: Evidence[]; trace: AgentTraceEntry }> {
  // Search what the message CITED, not the project codename. A codename like
  // "Project Atlas" collides with real manufacturers (Atlas Copco), which returns
  // confident, irrelevant sources — worse than returning nothing.
  const query = extras.sourceHint
    ? `${extras.sourceHint} ${change.newValue}`
    : `${extras.subjectDomain ?? change.subject} ${change.newValue} specification revision`;
  const { results, reachable } = await findEvidence(query);

  if (results.length === 0) {
    // Safeguard #2: no external source. Say so honestly rather than inventing support.
    return {
      evidence: [],
      trace: {
        agent: "evidence",
        model: "n/a",
        startedAt: new Date().toISOString(),
        durationMs: 0,
        summary: reachable
          ? "Exa reachable but found no external source; change is internally confirmed only"
          : "Exa unreachable; proceeding with no external evidence (labelled unverified)",
        tokensIn: null,
        tokensOut: null,
      },
    };
  }

  const user = [
    `Change: ${change.subject}`,
    extras.subjectDomain ? `Equipment: ${extras.subjectDomain}` : "",
    extras.sourceHint ? `The message cites: ${extras.sourceHint}` : "",
    `Previous value: ${change.previousValue}`,
    `New value: ${change.newValue}`,
    "",
    "Sources:",
    ...results.map((r, i) => `[${i}] ${r.title} (${r.publishedDate ?? "undated"})\n${r.highlight}`),
  ].join("\n");

  const { data, trace } = await runAgent({
    agent: "evidence",
    system: SYSTEM,
    user,
    schema: Out,
    summarise: (d) => {
      const kept = d.evidence.filter((e) => e.relevant);
      const against = kept.filter((e) => !e.supports).length;
      return `Exa returned ${results.length} source(s); ${kept.length} relevant, ${against} contradicting`;
    },
  });

  const mapped: Evidence[] = data.evidence
    .filter((e) => e.relevant && results[e.index])
    .map((e) => {
      const src = results[e.index];
      return {
        id: `ev_${e.index}`,
        title: src.title,
        url: src.url,
        publishedAt: src.publishedDate,
        highlight: e.highlight || src.highlight,
        sourceStatus: reachable ? ("live" as const) : ("cached" as const),
        supports: e.supports,
      };
    });

  return { evidence: mapped, trace };
}
