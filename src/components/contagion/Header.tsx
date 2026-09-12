"use client";

import type { InfectionReport, TruthChange } from "@/contract";
import { ThemeToggle } from "./ThemeToggle";
import { Bandage } from "./Bandage";

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

  // Not every affected artefact contains the old figure — an Exposed one was merely
  // worked out from it, and saying otherwise contradicts the list and the map.
  const carrying = nodes.filter((n) => n.status === "infected").length;
  const derived = nodes.filter((n) => n.status === "exposed").length;

  const because = [
    summary.alreadyCommunicated > 0 &&
      `${summary.alreadyCommunicated === 1 ? "one has" : `${word(summary.alreadyCommunicated)} have`} already gone to the customer`,
    summary.preserveAsHistorical > 0 &&
      `${summary.preserveAsHistorical === 1 ? "one records" : `${word(summary.preserveAsHistorical)} record`} what was actually built`,
  ].filter(Boolean) as string[];

  return (
    <div className="border-b border-rule bg-surface px-8 pb-4 pt-3">
      {/* The subject is the first thing on the page; the brand sits opposite it. */}
      <div className="flex items-center gap-6">
        <h1 className="min-w-0 flex-1 truncate text-[23px] font-semibold leading-tight tracking-tight text-ink">
          {change.subject}
        </h1>

        <span className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-infected/15">
            <Bandage size={20} />
          </span>
          <span className="font-mono text-[17px] font-semibold tracking-[0.2em] text-ink">
            PATCH
          </span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <div>
          <div className="flex items-baseline gap-7">
            <Revision label="was" value={change.previousValue} struck />
            <Revision label="now" value={change.newValue} />
            <span className="text-[12.5px] text-ink-3">
              {Math.round(change.confidence * 100)}% confidence
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-end gap-x-6 gap-y-3">
          <p className="max-w-[52ch] text-[13.5px] leading-relaxed text-ink-2">
            {word(carrying)} {carrying === 1 ? "artefact" : "artefacts"} still{" "}
            {carrying === 1 ? "carries" : "carry"} the old figure
            {derived > 0 &&
              `, and ${derived === 1 ? "one more was" : `${word(derived).toLowerCase()} more were`} worked out from it`}
            .{" "}
            <span className="font-medium text-immune-deep">
              {word(summary.safeToUpdate)} {summary.safeToUpdate === 1 ? "is" : "are"}{" "}
              safe to repair
            </span>{" "}
            without asking you.{" "}
            <span className="font-medium text-ink">
              {word(needsYou)} {needsYou === 1 ? "needs" : "need"} your judgement
            </span>
            {because.length > 0 && ` — ${because.join(", ")}`}.
          </p>

          <div className="flex shrink-0 items-center gap-2.5">
            <NominationStamp change={change} />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The nomination (ADR-0006). PATCH does not watch channels and it does not start on
 * its own — a person reacted with 🩹 and that is the only reason any of this exists.
 * It is the trust argument the whole product rests on, so it is stamped rather than
 * mentioned, and it links back to the message it came from.
 */
function NominationStamp({ change }: { change: TruthChange }) {
  const zero = change.patientZero;
  const href = zero?.permalink ?? undefined;
  const Tag = href ? "a" : "div";

  return (
    <Tag
      {...(href ? { href, target: "_blank", rel: "noreferrer" } : {})}
      title={
        zero
          ? `PATCH never starts on its own. ${change.announcedBy} reacted with the bandage in ${zero.channel}, and that is the only reason it ran.`
          : "PATCH never starts on its own. A person asked it to run."
      }
      className={`flex shrink-0 items-center gap-2.5 rounded-lg border border-infected/30 bg-infected/[0.07] py-1.5 pl-2 pr-3 ${
        href ? "transition-colors hover:bg-infected/[0.13]" : ""
      }`}
    >
      <Bandage size={17} />
      <span className="leading-tight">
        <span className="block text-[12.5px] text-ink-2">
          <span className="font-semibold text-ink">{change.announcedBy}</span> flagged
          this
          {zero && (
            <>
              {" in "}
              <span className="font-mono text-ink">{zero.channel}</span>
            </>
          )}
          {href && <span className="text-ink-3"> ↗</span>}
        </span>
        <span className="block text-[11.5px] text-ink-3">
          PATCH never starts on its own
        </span>
      </span>
    </Tag>
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
