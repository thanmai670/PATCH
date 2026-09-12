"use client";

import type { ReactNode } from "react";
import type { InfectionNode, TruthChange } from "@/contract";
import { MATCH_LABEL } from "./tokens";

/**
 * Atoms only — a chip, a button, a provenance line. Deliberately NOT a surface frame:
 * ADR-0009 says the five Repair Surfaces share no layout, and a shared <SurfaceShell>
 * is exactly how that decision would get quietly undone.
 */

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "stale" | "fresh" | "warn" | "violet" | "pink";
}) {
  const tones: Record<string, string> = {
    neutral: "border-rule bg-sunk text-ink-2",
    stale: "border-infected/35 bg-infected/10 text-infected-deep",
    fresh: "border-immune/35 bg-immune/10 text-immune-deep",
    warn: "border-exposed/40 bg-exposed/10 text-exposed-deep",
    violet: "border-historical/35 bg-historical/10 text-historical-deep",
    pink: "border-irreversible/35 bg-irreversible/10 text-irreversible-deep",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Action({
  children,
  onClick,
  variant = "secondary",
  active = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "quiet";
  active?: boolean;
  disabled?: boolean;
}) {
  const base =
    "rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
  const styles = {
    primary: "bg-ink text-white hover:bg-ink/85",
    secondary: "border border-rule bg-surface text-ink hover:bg-sunk",
    quiet: "text-ink-3 hover:text-ink",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${active ? "ring-2 ring-ink/25" : ""}`}
    >
      {children}
    </button>
  );
}

/** Why the classifier landed here — shown verbatim, per the contract's own note. */
export function Provenance({ node }: { node: InfectionNode }) {
  return (
    <div className="mt-6 border-t border-rule pt-3.5">
      <p className="text-[12.5px] leading-relaxed text-ink-2">{node.rationale}</p>
      <p className="mt-2 text-[12px] text-ink-3">
        PATCH {MATCH_LABEL[node.matchKind]}, and is{" "}
        {Math.round(node.confidence * 100)}% sure this is the same thing.
        {node.href ? (
          <>
            {" "}
            <a className="text-ink underline underline-offset-2" href={node.href}>
              Open the original
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}

/** Renders the stale value inside its sentence so the eye lands on what changed. */
export function Marked({
  text,
  needle,
  tone,
}: {
  text: string;
  needle: string;
  tone: "stale" | "fresh";
}) {
  if (!needle || !text.includes(needle)) return <>{text}</>;
  const parts = text.split(needle);
  const cls =
    tone === "stale"
      ? "rounded bg-infected/15 px-1 font-mono text-infected-deep"
      : "rounded bg-immune/15 px-1 font-mono text-immune-deep";
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className={cls}>{needle}</span>}
        </span>
      ))}
    </>
  );
}

export function ReviewBanner({ change }: { change: TruthChange }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-md border border-exposed/40 bg-exposed/[0.08] px-3.5 py-2.5">
      <span className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 border-exposed text-[9px] font-bold text-exposed-deep">
        !
      </span>
      <p className="text-[12.5px] leading-relaxed text-ink-2">
        PATCH will not include this in a bulk repair. Someone has to look at it before
        anything changes.
      </p>
    </div>
  );
}
