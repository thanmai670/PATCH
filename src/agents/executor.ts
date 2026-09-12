import {
  getDoc, updateDoc, updateDeal, createTask, sendMail, AmbiguousError,
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
          if (!node.ambiguousId) throw new Error("no ambiguousId");
          const { content, count } = await replaceInDocument(
            node.ambiguousId, change.previousValue, change.newValue,
            action.payload.content as string | undefined,
          );
          if (count === 0) {
            results.push({
              nodeId: node.id, ok: false, operation: null, ambiguousId: node.ambiguousId,
              error: `"${change.previousValue}" no longer appears in this document`,
            });
            break;
          }
          await updateDoc(node.ambiguousId, { content });
          results.push({
            nodeId: node.id, ok: true,
            operation: `PATCH /documents/${node.ambiguousId} (${count} occurrence${count === 1 ? "" : "s"})`,
            ambiguousId: node.ambiguousId, error: null,
          });
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
          const notice = String(
            action.payload.notice ??
            node.surfaceProps.proposedNotice ??
            `Note: superseded ${change.previousValue} → ${change.newValue}. Preserved as a historical record.`,
          );
          // APPEND. The stale value stays exactly as written - that is the whole
          // point of calling it historical.
          const appended = await appendToDocument(node.ambiguousId, notice);
          await updateDoc(node.ambiguousId, { content: appended });
          results.push({
            nodeId: node.id, ok: true,
            operation: `PATCH /documents/${node.ambiguousId} (annotated; original text untouched)`,
            ambiguousId: node.ambiguousId, error: null,
          });
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

/**
 * Rewrite one value inside a document, preserving everything else.
 *
 * The previous implementation sent the excerpt line as the whole body, which
 * would have replaced an entire document with a single sentence. Documents are
 * also ProseMirror JSON, not markdown, so a hand-written string mangles them:
 * the replacement runs over the serialised form and is parsed back, which
 * rewrites the text nodes and leaves the structure intact.
 */
async function replaceInDocument(
  id: string,
  previousValue: string,
  newValue: string,
  override?: string,
): Promise<{ content: unknown; count: number }> {
  const doc = await getDoc(id);
  const raw = doc.content;

  if (override && override.trim()) return { content: override, count: 1 };

  const isObject = raw !== null && typeof raw === "object";
  const serialised = isObject ? JSON.stringify(raw) : String(raw ?? "");

  // Escape for a global literal replacement; values carry ".", "(" and so on.
  const needle = previousValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const count = (serialised.match(new RegExp(needle, "g")) ?? []).length;
  if (count === 0) return { content: raw, count: 0 };

  const replaced = serialised.replace(new RegExp(needle, "g"), newValue);
  return { content: isObject ? JSON.parse(replaced) : replaced, count };
}

/** Append a note without touching a single character of the original. */
async function appendToDocument(id: string, notice: string): Promise<unknown> {
  const doc = await getDoc(id);
  const raw = doc.content as any;

  if (raw && typeof raw === "object" && Array.isArray(raw.content)) {
    return {
      ...raw,
      content: [
        ...raw.content,
        { type: "paragraph", content: [{ type: "text", text: `— ${notice}` }] },
      ],
    };
  }
  return `${String(raw ?? "")}\n\n> ${notice}`;
}
