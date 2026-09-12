"use client";
import type { AgentTraceEntry } from "@/contract";

/**
 * The "these are really six agents" proof. Keep it visible during the demo.
 */
export function TracePanel({ trace }: { trace: AgentTraceEntry[] }) {
  return (
    <div className="border-t border-rule bg-sunk/50 px-6 py-5">
      <h2 className="text-[13px] font-semibold text-ink">How PATCH worked this out</h2>
      <p className="mt-1 text-[12px] text-ink-3">
        Six agents ran in sequence. This is what each one actually did.
      </p>
      <ol className="mt-3.5 space-y-3">
        {trace.map((t) => (
          <li key={t.agent} className="border-l-2 border-rule pl-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] font-medium capitalize text-ink">
                {t.agent}
              </span>
              <span className="font-mono text-[11.5px] text-ink-3">
                {(t.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{t.summary}</p>
            <p className="mt-0.5 font-mono text-[11px] text-ink-3">{t.model}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
