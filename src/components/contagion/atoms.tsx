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
    neutral: "border-white/15 bg-white/5 text-white/70",
    stale: "border-red-500/40 bg-red-500/10 text-red-300",
    fresh: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    violet: "border-violet-500/40 bg-violet-500/10 text-violet-300",
    pink: "border-pink-500/40 bg-pink-500/10 text-pink-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${tones[tone]}`}
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
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "quiet";
  active?: boolean;
}) {
  const base =
    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40";
  const styles = {
    primary: "bg-emerald-500/90 text-black hover:bg-emerald-400",
    secondary: "border border-white/20 text-white/80 hover:bg-white/10",
    quiet: "text-white/45 hover:text-white/80",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${styles[variant]} ${active ? "ring-2 ring-white/60" : ""}`}
    >
      {children}
    </button>
  );
}

/** Why the classifier landed here — shown verbatim, per the contract's own note. */
export function Provenance({ node }: { node: InfectionNode }) {
  return (
    <div className="mt-5 border-t border-white/10 pt-3">
      <p className="text-[11px] leading-relaxed text-white/45">{node.rationale}</p>
      <p className="mt-2 text-[11px] text-white/30">
        {MATCH_LABEL[node.matchKind]} · {Math.round(node.confidence * 100)}% confidence
        {node.href ? (
          <>
            {" · "}
            <a className="underline hover:text-white/60" href={node.href}>
              open in workspace
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
      ? "rounded bg-red-500/25 px-1 text-red-200"
      : "rounded bg-emerald-500/25 px-1 text-emerald-200";
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
    <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
      <span className="mt-px text-amber-300">!</span>
      <p className="text-[11px] leading-relaxed text-amber-200/90">
        Flagged for human review. PATCH will not include this artefact in a batch
        approval for <span className="font-medium">{change.subject}</span>.
      </p>
    </div>
  );
}
