"use client";

import type { Evidence } from "@/contract";
import { Chip } from "./atoms";
import { formatDate } from "./formatDate";

type SourceStatus = Evidence["sourceStatus"];

const SOURCE: Record<
  SourceStatus,
  { tone: "fresh" | "warn" | "neutral"; label: string }
> = {
  live: { tone: "fresh", label: "live" },
  cached: { tone: "warn", label: "cached — source unreachable" },
  unverified: { tone: "neutral", label: "unverified" },
};

/**
 * Evidence informs; it never decides. A source that CONTRADICTS the change is shown,
 * not hidden — hiding it would make the rail an argument rather than a record.
 */
export function EvidenceRail({ evidence }: { evidence: Evidence[] }) {
  const contradicting = evidence.filter((e) => !e.supports).length;

  return (
    <div className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] uppercase tracking-wider text-white/40">Evidence</h2>
        <span className="text-[11px] text-white/30">
          {evidence.length} source{evidence.length === 1 ? "" : "s"}
          {contradicting > 0 && ` · ${contradicting} contradicting`}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
        Evidence informs the Truth Change. It never decides it.
      </p>

      <ul className="mt-4 space-y-3">
        {evidence.map((ev) => {
          const source = SOURCE[ev.sourceStatus];
          return (
            <li
              key={ev.id}
              className={`rounded-md border p-3 ${
                ev.supports
                  ? "border-white/10 bg-white/[0.02]"
                  : "border-amber-500/40 bg-amber-500/[0.06]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone={source.tone}>{source.label}</Chip>
                {!ev.supports && <Chip tone="warn">contradicts this change</Chip>}
              </div>

              <p className="mt-2 text-[13px] font-medium leading-snug text-white/85">
                {ev.title}
              </p>

              <p className="mt-1.5 border-l-2 border-white/15 pl-2.5 text-[12px] italic leading-relaxed text-white/55">
                {ev.highlight}
              </p>

              <p className="mt-2 text-[11px] text-white/30">
                {formatDate(ev.publishedAt)}
                {ev.url && (
                  <>
                    {" · "}
                    <a
                      href={ev.url}
                      className="underline hover:text-white/60"
                      target="_blank"
                      rel="noreferrer"
                    >
                      source
                    </a>
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>

      {evidence.length === 0 && (
        <p className="mt-4 text-[12px] text-white/35">
          No external evidence was found. The Truth Change rests on the nomination alone.
        </p>
      )}

      <p className="mt-5 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/30">
        Select an artefact on the map to open its Repair Surface.
      </p>
    </div>
  );
}
