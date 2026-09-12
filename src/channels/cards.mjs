/**
 * PATCH's Slack cards (#9).
 *
 * Built by calling the Channels UI component functions directly rather than with
 * JSX, so this file stays plain ESM and needs no build step. Each component is
 * `(props) => ChannelNode`, and `children` is just a prop.
 */
import {
  Message, Header, Section, Fields, Field, Context, Divider, Actions, Button, Markdown,
} from "@copilotkit/channels-ui";

const RED = "#ef4444";
const AMBER = "#f59e0b";
const GREEN = "#10b981";

/**
 * Card 1 — the interpretation, before PATCH touches anything.
 * This is the nomination gate (ADR-0006): PATCH asks before it searches or writes.
 */
export function confirmationCard({ change, onConfirm, onReject, onEdit }) {
  return Message({
    accent: AMBER,
    fallbackText: `Possible truth change: ${change.subject} ${change.previousValue} → ${change.newValue}`,
    children: [
      Header({ children: "Possible truth change detected" }),
      Section({ children: Markdown({ children: `*${change.subject}*` }) }),
      Fields({
        children: [
          Field({ label: "Previous value", children: change.previousValue }),
          Field({ label: "New value", children: change.newValue }),
          Field({ label: "Confidence", children: `${Math.round(change.confidence * 100)}%` }),
          Field({ label: "Announced by", children: change.announcedBy }),
        ],
      }),
      Context({ children: "PATCH has not searched or changed anything yet." }),
      Actions({
        children: [
          Button({ value: "confirm", onClick: onConfirm, children: "Confirm change" }),
          Button({ value: "edit", onClick: onEdit, children: "Edit interpretation" }),
          Button({ value: "reject", onClick: onReject, children: "Not a factual change" }),
        ],
      }),
    ],
  });
}

/**
 * Card 2 — the spread summary. Deliberately counts only: dumping six artefacts into
 * a channel is noisy and can expose items to people without permission.
 */
export function summaryCard({ report, viewUrl }) {
  const s = report.summary;
  const evidenceLine = report.evidence.length
    ? `${report.evidence.length} external source(s), ${report.evidence.filter((e) => !e.supports).length} contradicting`
    : "No external source found — internally confirmed only";

  return Message({
    accent: RED,
    fallbackText: `The old value appears in ${report.nodes.length} connected items`,
    children: [
      Header({ children: `The old value appears in ${report.nodes.length} connected items` }),
      Fields({
        children: [
          Field({ label: "Safe to update", children: String(s.safeToUpdate) }),
          Field({ label: "Need technical review", children: String(s.requiresReview) }),
          Field({ label: "Already communicated", children: String(s.alreadyCommunicated) }),
          Field({ label: "Preserve as historical", children: String(s.preserveAsHistorical) }),
        ],
      }),
      Context({ children: evidenceLine }),
      Divider({}),
      Actions({
        children: [
          Button({ url: viewUrl, children: "Open Contagion View" }),
        ],
      }),
    ],
  });
}

/**
 * Card 3 — the audit record, posted back where the change was announced, so the
 * thread carries the whole lifecycle: announcement → verification → impact →
 * decision → action → audit.
 */
export function auditCard({ report, execution, approvedBy }) {
  const ok = execution.results.filter((r) => r.ok);
  const failed = execution.results.filter((r) => !r.ok);
  const sourceLine = report.evidence.find((e) => e.supports)?.title ?? "Internal message only";

  return Message({
    accent: failed.length ? AMBER : GREEN,
    fallbackText: "Truth propagation contained",
    children: [
      Header({ children: "Truth propagation contained" }),
      Section({
        children: Markdown({
          children: ok.map((r) => `• ${r.operation}`).join("\n") || "• No writes were approved",
        }),
      }),
      ...(failed.length
        ? [Section({ children: Markdown({ children: failed.map((r) => `• _${r.error}_`).join("\n") }) })]
        : []),
      Fields({
        children: [
          Field({ label: "Approved by", children: approvedBy }),
          Field({ label: "Source", children: sourceLine }),
        ],
      }),
      Context({ children: `Report ${report.reportId}` }),
    ],
  });
}
