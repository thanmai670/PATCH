"use client";

import type { InfectionReport } from "@/contract";
import { ThemeToggle } from "./ThemeToggle";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
const word = (n: number) => WORDS[n] ?? String(n);

/**
 * The first three seconds. A judge should read what changed, how far it reached, and
 * how much of it PATCH is willing to touch — as sentences, not a row of counters.
 *
 * The change is set as a revision: `was` / `now`, the way a drawing office writes one.
 */
export function Header({ report }: { report: InfectionReport }) {
  const { change, summary, nodes } = report;
  const needsYou =
    summary.requiresReview + summary.alreadyCommunicated + summary.preserveAsHistorical;

  return (
    <div className="border-b border-rule bg-surface px-8 pb-4 pt-3.5">
      <div className="flex items-center gap-2.5">
        <span className="text-[14px]" aria-hidden>
          🩹
        </span>
        <span className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-ink-3">
          PATCH
        </span>
        <span className="h-px flex-1 bg-rule" />
        <span className="text-[12px] text-ink-3">
          {change.patientZero
            ? `Raised by ${change.announcedBy} in ${change.patientZero.channel}`
            : `Raised by ${change.announcedBy}`}
        </span>
        <ThemeToggle />
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-ink">
            {change.subject}
          </h1>

          <div className="mt-2 flex items-baseline gap-7">
            <Revision label="was" value={change.previousValue} struck />
            <Revision label="now" value={change.newValue} />
            <span className="text-[12.5px] text-ink-3">
              {Math.round(change.confidence * 100)}% confidence
            </span>
          </div>
        </div>

        <p className="max-w-[54ch] text-[13.5px] leading-relaxed text-ink-2">
          {word(nodes.length)} artefacts still carry the old figure.{" "}
          <span className="font-medium text-immune-deep">
            {word(summary.safeToUpdate)} {summary.safeToUpdate === 1 ? "is" : "are"} safe
            to repair
          </span>{" "}
          without asking you.{" "}
          <span className="font-medium text-ink">
            {word(needsYou)} {needsYou === 1 ? "needs" : "need"} your judgement
          </span>{" "}
          — one already went to the customer, one records what was actually built.
        </p>
      </div>
    </div>
  );
}

function Revision({
  label,
  value,
  struck = false,
}: {
  label: string;
  value: string;
  struck?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="text-[12.5px] text-ink-3">{label}</span>
      <span
        className={
          struck
            ? "font-mono text-[26px] font-medium leading-none tracking-[-0.03em] text-ink-3 line-through decoration-infected/70 decoration-[2px]"
            : "font-mono text-[26px] font-semibold leading-none tracking-[-0.03em] text-immune-deep"
        }
      >
        {value}
      </span>
    </span>
  );
}
