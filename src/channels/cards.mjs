/**
 * PATCH's Slack cards (#9).
 *
 * Built by calling the Channels UI component functions directly rather than with
 * JSX, so this file stays plain ESM and needs no build step. Each component is
 * `(props) => ChannelNode`, and `children` is just a prop.
 */
import {
  Message, Header, Section, Fields, Field, Context, Divider, Actions, Button, Markdown,
  Chart, Table, Row, Cell, Select,
} from "@copilotkit/channels-ui";

/** Ten-block meter — reads at a glance in Slack, where a number alone does not. */
function confidenceBar(v) {
  const filled = Math.max(0, Math.min(10, Math.round((v ?? 0) * 10)));
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

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
      Section({
        children: Markdown({
          children: `*${change.subject}*\n\n~${change.previousValue}~  →  *${change.newValue}*`,
        }),
      }),
      Fields({
        children: [
          Field({ label: "Confidence", children: `${confidenceBar(change.confidence)} ${Math.round(change.confidence * 100)}%` }),
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

  const ICON = {
    editable: "🟢",
    historical: "🟣",
    irreversible: "🔴",
  };
  const STATUS = { infected: "infected", exposed: "exposed", immune: "immune" };

  return Message({
    accent: RED,
    fallbackText: `The old value appears in ${report.nodes.length} connected items`,
    children: [
      Header({ children: `${report.change.previousValue} → ${report.change.newValue} spread to ${report.nodes.length} items` }),
      Section({ children: Markdown({ children: `*${report.change.subject}*` }) }),

      // A picture of the decision, not just four numbers.
      Chart({
        type: "donut",
        title: "What PATCH may do with each artefact",
        data: [
          { label: "Safe to update", value: s.safeToUpdate },
          { label: "Needs review", value: s.requiresReview },
          { label: "Already sent", value: s.alreadyCommunicated },
          { label: "Historical", value: s.preserveAsHistorical },
        ].filter((d) => d.value > 0),
      }),

      Divider({}),

      // Per-artefact detail, so the counts above are inspectable rather than asserted.
      Table({
        columns: [{ header: "Artefact" }, { header: "State" }, { header: "Repair" }],
        children: report.nodes.map((n) =>
          Row({
            children: [
              Cell({ children: `${ICON[n.disposition] ?? "⚪"} ${n.title.slice(0, 38)}` }),
              Cell({ children: `${STATUS[n.status]}${n.requiresHumanReview ? " · review" : ""}` }),
              Cell({ children: n.surface.replace(/_/g, " ") }),
            ],
          }),
        ),
      }),

      Context({ children: `🟢 editable   🟣 historical — never edited   🔴 already sent — corrective action only` }),
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
      ...(ok.length
        ? [Table({
            columns: [{ header: "Action" }, { header: "Where" }],
            children: ok.map((r) =>
              Row({
                children: [
                  Cell({ children: "✅ applied" }),
                  Cell({ children: String(r.operation ?? "").slice(0, 60) }),
                ],
              }),
            ),
          })]
        : [Section({ children: Markdown({ children: "_No writes were approved._" }) })]),
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
