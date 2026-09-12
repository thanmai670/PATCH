"use client";

import type { Evidence } from "@/contract";
import { Chip } from "./atoms";
import { formatDate } from "./formatDate";

const SOURCE: Record<
  Evidence["sourceStatus"],
  { tone: "fresh" | "warn" | "neutral"; label: string }
> = {
  live: { tone: "fresh", label: "checked just now" },
  cached: { tone: "warn", label: "from a saved copy — site was down" },
  unverified: { tone: "neutral", label: "not checked" },
};

/**
 * Evidence informs; it never decides. A source that CONTRADICTS the change is shown,
 * not hidden — hiding it would make this an argument rather than a record.
 */
export function EvidenceRail({ evidence }: { evidence: Evidence[] }) {
  const against = evidence.filter((e) => !e.supports).length;

  return (
    <div className="px-6 py-6">
      <h2 className="text-[15px] font-semibold text-ink">What PATCH checked</h2>
      <p className="mt-1.5 max-w-[46ch] text-[13px] leading-relaxed text-ink-2">
        {evidence.length === 1 ? "One source" : `${evidence.length} sources`} were read
        before anything was proposed.
        {against > 0 &&
          ` ${against === 1 ? "One disagrees" : `${against} disagree`} with the change, and ${against === 1 ? "it is" : "they are"} shown here too.`}{" "}
        None of them decide anything — you do.
      </p>

      <ul className="mt-5 space-y-4">
        {evidence.map((ev) => {
          const source = SOURCE[ev.sourceStatus];
          return (
            <li
              key={ev.id}
              className={`rounded-lg border p-4 ${
                ev.supports
                  ? "border-rule bg-surface"
                  : "border-exposed/45 bg-exposed/[0.07]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone={source.tone}>{source.label}</Chip>
                {!ev.supports && <Chip tone="warn">disagrees with the change</Chip>}
              </div>

              <p className="mt-2.5 text-[13.5px] font-medium leading-snug text-ink">
                {ev.title}
              </p>

              <p className="mt-2 border-l-2 border-rule pl-3 text-[13px] leading-relaxed text-ink-2">
                {ev.highlight}
              </p>

              <p className="mt-2.5 text-[12px] text-ink-3">
                {formatDate(ev.publishedAt, "no date")}
                {ev.url && (
                  <>
                    {"  "}
                    <a
                      href={ev.url}
                      className="text-ink underline underline-offset-2"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read it
                    </a>
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>

      {evidence.length === 0 && (
        <p className="mt-4 text-[13px] text-ink-2">
          Nothing external was found. This change rests on what was said in the channel.
        </p>
      )}

      <p className="mt-6 border-t border-rule pt-3.5 text-[13px] text-ink-3">
        Pick any circle on the map to see what PATCH wants to do about it.
      </p>
    </div>
  );
}
