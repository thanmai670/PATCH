"use client";
import type { AgentTraceEntry } from "@/contract";

/**
 * The "these are really six agents" proof. Keep it visible during the demo.
 */
export function TracePanel({ trace }: { trace: AgentTraceEntry[] }) {
  return (
    <div className="border-t border-white/10 p-4">
      <h2 className="mb-3 text-xs uppercase tracking-wider text-white/40">
        Agent trace
      </h2>
      <ol className="space-y-2">
        {trace.map((t) => (
          <li key={t.agent} className="text-xs">
            <div className="flex justify-between gap-2">
              <span className="font-medium text-white/80">{t.agent}</span>
              <span className="text-white/40">{t.durationMs}ms</span>
            </div>
            <p className="text-white/50">{t.summary}</p>
            <p className="text-white/25">{t.model}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
