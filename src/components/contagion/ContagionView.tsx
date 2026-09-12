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
import { MapLegend } from "./MapLegend";
import { ArtefactList } from "./ArtefactList";
import { Header } from "./Header";
import { actions as offeredActions } from "./surfaceProps";
import { REFUSALS, REPAIR_DECISIONS } from "./plainLanguage";

type Decision = { decision: string; payload: Record<string, unknown> };

/**
 * WORKSTREAM B OWNS THIS TREE.
 * Everything below renders from `report` — which is the frozen contract shape,
 * so it works identically against the fixture and against live agent output.
 */
export function ContagionView({ report }: { report: InfectionReport }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [lasso, setLasso] = useState<LassoResult>({ safe: [], excluded: [] });
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [healed, setHealed] = useState<string[]>([]);
  const [unconfirmed, setUnconfirmed] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);

  const selected: InfectionNode | null =
    report.nodes.find((n) => n.id === selectedId) ?? null;

  const byId = useMemo(
    () => new Map(report.nodes.map((n) => [n.id, n])),
    [report.nodes],
  );

  /** What the human decided about each artefact, for the map and the list to show. */
  const outcomes = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(decisions).map(([id, d]) => [id, d.decision]),
      ) as Record<string, string>,
    [decisions],
  );

  /**
   * Heal first, ask the network second (ADR-0011). A dead route degrades the
   * repairs to Unconfirmed; it never turns the screen into an error.
   */
  async function submit(actions: RepairAction[]) {
    if (actions.length === 0) return;
    const ids = actions.map((a) => a.nodeId);
    // Only a decision that changes the artefact heals it. A queued correction or an
    // annotation is a decision about an artefact that stays exactly as it was.
    const repaired = actions
      .filter((a) => REPAIR_DECISIONS.has(a.decision))
      .map((a) => a.nodeId);

    const plan: RepairPlan = {
      reportId: report.reportId,
      approvedBy: report.change.announcedBy,
      actions,
    };

    setApproving(true);
    if (repaired.length > 0) setHealed((h) => [...new Set([...h, ...repaired])]);
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
      setUnconfirmed((u) => [...new Set([...u, ...repaired])]);
    } finally {
      setApproving(false);
    }
  }

  /** The action a node carries into a batch when the human has not opened it. */
  function buildAction(nodeId: string): RepairAction | null {
    const node = byId.get(nodeId);
    if (!node) return null;
    const made = decisions[nodeId];
    if (made) {
      return {
        nodeId,
        surface: node.surface,
        decision: made.decision,
        payload: made.payload,
      };
    }
    // Honour what the planner actually offered rather than assuming "accept".
    const offered = offeredActions(node.surfaceProps).filter((a) => !REFUSALS.has(a));
    return {
      nodeId,
      surface: node.surface,
      decision: offered[0] ?? "accept",
      payload: {},
    };
  }

  /** A decision taken on one artefact's own Repair Surface. */
  function handleDecide(
    nodeId: string,
    decision: string,
    payload: Record<string, unknown> = {},
  ) {
    setDecisions((d) => ({ ...d, [nodeId]: { decision, payload } }));

    if (REFUSALS.has(decision)) {
      setHealed((h) => h.filter((id) => id !== nodeId));
      setUnconfirmed((u) => u.filter((id) => id !== nodeId));
      return;
    }

    const node = byId.get(nodeId);
    if (!node) return;
    void submit([{ nodeId, surface: node.surface, decision, payload }]);
  }

  function approveLasso() {
    const actions = lasso.safe
      // Someone who opened an artefact and declined it must not have that reversed
      // by a later batch that happens to enclose it.
      .filter((id) => !REFUSALS.has(decisions[id]?.decision ?? ""))
      .map(buildAction)
      .filter((a): a is RepairAction => a !== null);
    setLasso({ safe: [], excluded: [] });
    void submit(actions);
  }

  return (
    <main className="grid h-screen grid-cols-[286px_1fr_408px] grid-rows-[auto_1fr_auto] bg-paper">
      <div className="col-span-3">
        <Header report={report} />
      </div>

      <aside className="row-span-2 min-h-0 border-r border-rule bg-surface">
        <ArtefactList
          nodes={report.nodes}
          change={report.change}
          selectedId={selectedId}
          hoveredId={hoveredId}
          healed={healed}
          unconfirmed={unconfirmed}
          outcomes={outcomes}
          onSelect={setSelectedId}
          onHover={setHoveredId}
        />
      </aside>

      <section className="relative min-h-0 overflow-hidden">
        <InfectionMap
          report={report}
          selectedId={selectedId}
          hoveredId={hoveredId}
          lassoed={lasso.safe}
          onSelect={setSelectedId}
          onHover={setHoveredId}
          onLasso={(result) => {
            // An artefact the human already declined is held back like any other,
            // rather than silently counted into the batch that encloses it.
            const refused = (id: string) =>
              REFUSALS.has(decisions[id]?.decision ?? "");
            setLasso({
              safe: result.safe.filter((id) => !refused(id)),
              excluded: [...result.excluded, ...result.safe.filter(refused)],
            });
          }}
          healed={healed}
          unconfirmed={unconfirmed}
          outcomes={outcomes}
        />

      </section>

      <aside className="row-span-2 overflow-y-auto border-l border-rule bg-surface">
        {selected ? (
          // Keyed by artefact: two nodes can share a surface kind (n_proposal and
          // n_techdoc are both document_diff) and must not share its draft state.
          <RepairSurface
            key={selected.id}
            node={selected}
            change={report.change}
            evidence={report.evidence}
            onDecide={handleDecide}
          />
        ) : (
          <EvidenceRail evidence={report.evidence} />
        )}
        <TracePanel trace={report.trace} />
      </aside>

      <footer className="flex items-center justify-between gap-8 border-t border-rule bg-surface px-6 py-3">
        <MapLegend />
        <ApprovalBar
          lasso={lasso}
          byId={byId}
          outcomes={outcomes}
          approving={approving}
          healedCount={healed.length}
          unconfirmedCount={unconfirmed.length}
          onApprove={approveLasso}
          onClear={() => setLasso({ safe: [], excluded: [] })}
          onInspect={(id) => setSelectedId(id)}
        />
      </footer>
    </main>
  );
}
