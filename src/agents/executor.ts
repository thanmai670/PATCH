import {
  updateDoc, updateDeal, createTask, sendMail, AmbiguousError,
} from "@/adapters/ambiguous";
import type { RepairPlan, ExecutionReport, ExecutionResult, InfectionNode } from "@/contract";

/**
 * Approved plan -> real Ambiguous writes. Nothing reaches the workspace without an
 * approved RepairPlan (ADR-0006).
 *
 * Deliberately NOT an LLM call: by this point every decision has been made and approved.
 * A model here could only re-litigate a human's choice.
 *
 * The disposition guard below is the last line of defence: even if a plan somehow asks
 * to edit an irreversible or historical artefact, this refuses.
 */
export async function executor(
  plan: RepairPlan,
  nodes: InfectionNode[],
  change: { previousValue: string; newValue: string },
): Promise<ExecutionReport> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const results: ExecutionResult[] = [];

  for (const action of plan.actions) {
    const node = byId.get(action.nodeId);
    if (!node) {
      results.push({ nodeId: action.nodeId, ok: false, operation: null, ambiguousId: null, error: "unknown node" });
      continue;
    }

    const edits = action.decision === "accept" || action.decision === "rewrite";
    if (edits && node.disposition !== "editable") {
      results.push({
        nodeId: node.id, ok: false, operation: null, ambiguousId: node.ambiguousId,
        error: `refused: ${node.disposition} artefacts are never edited in place`,
      });
      continue;
    }

    try {
      if (action.decision === "except") {
        results.push({ nodeId: node.id, ok: true, operation: "marked as intentional exception", ambiguousId: node.ambiguousId, error: null });
        continue;
      }

      switch (node.surface) {
        case "document_diff": {
          const body = String(action.payload.content ?? "");
          const next = body || undefined;
          if (!node.ambiguousId) throw new Error("no ambiguousId");
          await updateDoc(node.ambiguousId, next ? { content: next } : { content: replaceIn(node, change) });
          results.push({ nodeId: node.id, ok: true, operation: `PATCH /documents/${node.ambiguousId}`, ambiguousId: node.ambiguousId, error: null });
          break;
        }
        case "field_change": {
          const field = node.excerpt?.field ?? "motor_rating";
          if (!node.ambiguousId) throw new Error("no ambiguousId");
          await updateDeal(node.ambiguousId, { custom_properties: { [field]: change.newValue } });
          results.push({ nodeId: node.id, ok: true, operation: `PATCH /crm/deals/${node.ambiguousId} (${field})`, ambiguousId: node.ambiguousId, error: null });
          break;
        }
        case "dependency_decision": {
          const made = await createTask({
            title: `Technical review — ${node.title}`,
            description: String(action.payload.note ?? `Review the impact of ${change.previousValue} → ${change.newValue} on this work before it proceeds.`),
            priority: (action.payload.urgency as "high") ?? "high",
          });
          results.push({ nodeId: node.id, ok: true, operation: `POST /tasks (review task ${made.id})`, ambiguousId: made.id, error: null });
          break;
        }
        case "corrective_message": {
          const to = (node.surfaceProps.recipients as string[] | undefined) ?? [];
          const made = await sendMail({
            to,
            subject: String(action.payload.subject ?? `Correction — ${node.title}`),
            body_markdown: String(action.payload.body ?? `Correcting an earlier message: the value is now ${change.newValue}, not ${change.previousValue}.`),
          });
          results.push({ nodeId: node.id, ok: true, operation: `POST /mail/send (correction ${made.id})`, ambiguousId: made.id, error: null });
          break;
        }
        case "preservation_notice": {
          if (!node.ambiguousId) throw new Error("no ambiguousId");
          const notice = String(action.payload.notice ?? node.surfaceProps.proposedNotice ?? `Note: this value was superseded (${change.previousValue} → ${change.newValue}). This document is preserved as a historical record.`);
          await updateDoc(node.ambiguousId, { content: `${node.excerpt?.before ?? ""}\n\n> ${notice}` });
          results.push({ nodeId: node.id, ok: true, operation: `PATCH /documents/${node.ambiguousId} (annotation appended, original preserved)`, ambiguousId: node.ambiguousId, error: null });
          break;
        }
      }
    } catch (e) {
      results.push({
        nodeId: node.id, ok: false, operation: null, ambiguousId: node.ambiguousId,
        error: e instanceof AmbiguousError ? `${e.status} ${e.body.slice(0, 160)}` : String(e),
      });
    }
  }

  return {
    reportId: plan.reportId,
    results,
    auditRecordId: null,
    completedAt: new Date().toISOString(),
  };
}

function replaceIn(node: InfectionNode, change: { previousValue: string; newValue: string }) {
  return (node.excerpt?.after ?? "").length ? node.excerpt!.after : change.newValue;
}
