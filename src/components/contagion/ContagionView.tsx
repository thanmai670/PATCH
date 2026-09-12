"use client";

import { useMemo, useState } from "react";
import type {
  InfectionReport,
  InfectionNode,
  RepairAction,
  RepairPlan,
} from "@/contract";
import { InfectionMap, type LassoResult } from "./InfectionMap";
import { RepairSurface } from "./RepairSurface";
import { TracePanel } from "./TracePanel";
import { EvidenceRail } from "./EvidenceRail";
import { ApprovalBar } from "./ApprovalBar";

/**
 * WORKSTREAM B OWNS THIS TREE.
 * Everything below renders from `report` — which is the frozen contract shape,
 * so it works identically against the fixture and against live agent output.
 */
export function ContagionView({ report }: { report: InfectionReport }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lasso, setLasso] = useState<LassoResult>({ safe: [], excluded: [] });
  const [healed, setHealed] = useState<string[]>([]);
  const [unconfirmed, setUnconfirmed] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);

  const selected: InfectionNode | null =
    report.nodes.find((n) => n.id === selectedId) ?? null;

  const byId = useMemo(
    () => new Map(report.nodes.map((n) => [n.id, n])),
    [report.nodes],
  );

  /**
   * Heal first, ask the network second (ADR-0011). A dead route degrades the
   * repairs to Unconfirmed; it never turns the screen into an error.
   */
  async function approve(ids: string[]) {
    if (ids.length === 0) return;

    const actions: RepairAction[] = ids.flatMap((id) => {
      const node = byId.get(id);
      if (!node) return [];
      return [{ nodeId: id, surface: node.surface, decision: "accept", payload: {} }];
    });

    const plan: RepairPlan = {
      reportId: report.reportId,
      approvedBy: report.change.announcedBy,
      actions,
    };

    setApproving(true);
    setHealed((h) => [...new Set([...h, ...ids])]);
    setLasso({ safe: [], excluded: [] });
    console.info("[PATCH] RepairPlan", plan);

    try {
      const res = await fetch("/api/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (!res.ok) throw new Error(`repair route returned ${res.status}`);
      setUnconfirmed((u) => u.filter((id) => !ids.includes(id)));
    } catch {
      // Approved, not applied. The distinction stays on screen.
      setUnconfirmed((u) => [...new Set([...u, ...ids])]);
    } finally {
      setApproving(false);
    }
  }

  return (
    <main className="grid h-screen grid-cols-[1fr_420px] grid-rows-[auto_1fr]">
      <header className="col-span-2 border-b border-white/10 px-6 py-4">
        <h1 className="text-lg font-semibold">{report.change.subject}</h1>
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
          lassoed={lasso.safe}
          onSelect={setSelectedId}
          onLasso={setLasso}
          healed={healed}
          unconfirmed={unconfirmed}
        />

        <ApprovalBar
          lasso={lasso}
          byId={byId}
          approving={approving}
          healedCount={healed.length}
          unconfirmedCount={unconfirmed.length}
          onApprove={() => approve(lasso.safe)}
          onClear={() => setLasso({ safe: [], excluded: [] })}
          onInspect={(id) => setSelectedId(id)}
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
