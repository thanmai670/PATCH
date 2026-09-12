"use client";

import type { Evidence, InfectionNode, TruthChange } from "@/contract";
import { DocumentDiffSurface } from "./surfaces/DocumentDiffSurface";
import { FieldChangeSurface } from "./surfaces/FieldChangeSurface";
import { DependencyDecisionSurface } from "./surfaces/DependencyDecisionSurface";
import { CorrectiveMessageSurface } from "./surfaces/CorrectiveMessageSurface";
import { PreservationNoticeSurface } from "./surfaces/PreservationNoticeSurface";

/**
 * Selects the Repair Surface from the artefact's kind and disposition.
 *
 * This is a dispatcher and nothing more. It holds no layout: each surface below is
 * structurally its own interface, which is the product's argument (ADR-0009). If this
 * file ever grows a wrapper with a title bar and a button row, the argument is gone.
 */
export function RepairSurface({
  node,
  change,
  evidence = [],
  onDecide = () => {},
}: {
  node: InfectionNode;
  change: TruthChange;
  evidence?: Evidence[];
  onDecide?: (
    nodeId: string,
    decision: string,
    payload?: Record<string, unknown>,
  ) => void;
}) {
  const decide = (decision: string, payload?: Record<string, unknown>) =>
    onDecide(node.id, decision, payload);

  switch (node.surface) {
    case "document_diff":
      return <DocumentDiffSurface node={node} change={change} onDecide={decide} />;
    case "field_change":
      return (
        <FieldChangeSurface
          node={node}
          change={change}
          evidence={evidence}
          onDecide={decide}
        />
      );
    case "dependency_decision":
      return <DependencyDecisionSurface node={node} change={change} onDecide={decide} />;
    case "corrective_message":
      return <CorrectiveMessageSurface node={node} change={change} onDecide={decide} />;
    case "preservation_notice":
      return <PreservationNoticeSurface node={node} change={change} onDecide={decide} />;
    default:
      // The planner produces these live; an unknown kind degrades, it never crashes.
      return (
        <div className="p-5">
          <h2 className="text-base font-semibold">{node.title}</h2>
          <p className="mt-2 text-xs text-white/50">
            No repair surface is defined for <code>{String(node.surface)}</code>. Open the
            artefact in the workspace to repair it by hand.
          </p>
        </div>
      );
  }
}
