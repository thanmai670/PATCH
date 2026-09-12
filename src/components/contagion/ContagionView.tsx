"use client";

import { useState } from "react";
import type { InfectionReport, InfectionNode } from "@/contract";
import { InfectionMap } from "./InfectionMap";
import { RepairSurface } from "./RepairSurface";
import { TracePanel } from "./TracePanel";
import { EvidenceRail } from "./EvidenceRail";

/**
 * WORKSTREAM B OWNS THIS TREE.
 * Everything below renders from `report` — which is the frozen contract shape,
 * so it works identically against the fixture and against live agent output.
 */
export function ContagionView({ report }: { report: InfectionReport }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lassoed, setLassoed] = useState<string[]>([]);
  const selected: InfectionNode | null =
    report.nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <main className="grid h-screen grid-cols-[1fr_420px] grid-rows-[auto_1fr]">
      <header className="col-span-2 border-b border-white/10 px-6 py-4">
        <h1 className="text-lg font-semibold">
          {report.change.subject}
        </h1>
        <p className="text-sm text-white/60">
          <span className="text-infected line-through">{report.change.previousValue}</span>
          {" → "}
          <span className="text-immune">{report.change.newValue}</span>
          {" · "}
          {report.summary.safeToUpdate} safe · {report.summary.requiresReview} need review ·{" "}
          {report.summary.alreadyCommunicated} already sent ·{" "}
          {report.summary.preserveAsHistorical} historical
        </p>
      </header>

      <section className="relative overflow-hidden">
        <InfectionMap
          report={report}
          selectedId={selectedId}
          lassoed={lassoed}
          onSelect={setSelectedId}
          onLasso={setLassoed}
        />
      </section>

      <aside className="overflow-y-auto border-l border-white/10">
        {selected ? (
          <RepairSurface
            node={selected}
            change={report.change}
            evidence={report.evidence}
          />
        ) : (
          <EvidenceRail evidence={report.evidence} />
        )}
        <TracePanel trace={report.trace} />
      </aside>
    </main>
  );
}
