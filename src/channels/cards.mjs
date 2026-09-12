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

/* ── Model picker ──────────────────────────────────────────────────────────── */

const AGENTS = ["interpreter", "evidence", "tracer", "classifier", "planner", "executor"];

/** Per-million-token price, which is how people actually compare models. */
function perMillion(p) {
  const n = Number(p);
  return Number.isFinite(n) ? `$${(n * 1_000_000).toFixed(2)}/M` : "—";
}

/**
 * Card showing the current per-agent routing and a picker of OpenRouter models.
 *
 * Only models advertising `response_format` are offered: every agent demands
 * JSON back and validates it with Zod, so a model without JSON mode would fail
 * schema validation twice and abort the run. Offering it would be a trap.
 */
export function modelPickerCard({ current, models, agent, onPick, onPickAgent }) {
  const scope = agent ?? "all agents";

  return Message({
    accent: "#6366f1",
    fallbackText: "Choose an OpenRouter model",
    children: [
      Header({ children: "Model routing" }),
      Section({
        children: Markdown({
          children: `Every agent calls *OpenRouter*. Pick a model to apply to *${scope}*.`,
        }),
      }),

      Table({
        columns: [{ header: "Agent" }, { header: "Model" }],
        children: AGENTS.map((a) =>
          Row({
            children: [
              Cell({ children: a === "tracer" ? `${a} (no LLM)` : a }),
              Cell({ children: a === "tracer" ? "mechanical retrieval" : (current[a] ?? "—") }),
            ],
          }),
        ),
      }),

      Divider({}),

      // Buttons, not Select: Slack renders Select as a bare heading here, which
      // left the card looking broken. Buttons render natively.
      Section({ children: Markdown({ children: "*Apply to*" }) }),
      Actions({
        children: [
          Button({ value: "__all__", onClick: onPickAgent, children: "All agents" }),
          Button({ value: "interpreter", onClick: onPickAgent, children: "interpreter" }),
          Button({ value: "evidence", onClick: onPickAgent, children: "evidence" }),
          Button({ value: "classifier", onClick: onPickAgent, children: "classifier" }),
          Button({ value: "planner", onClick: onPickAgent, children: "planner" }),
        ],
      }),

      Section({
        children: Markdown({
          children: `*Pick a model*  ·  _currently applying to ${scope}_`,
        }),
      }),
      Actions({
        children: models.slice(0, 5).map((m) =>
          Button({ value: m.id, onClick: onPick, children: `${m.id.split("/").pop()} ${perMillion(m.pricing?.prompt)}`.slice(0, 70) }),
        ),
      }),
      ...(models.length > 5
        ? [Actions({
            children: models.slice(5, 10).map((m) =>
              Button({ value: m.id, onClick: onPick, children: `${m.id.split("/").pop()} ${perMillion(m.pricing?.prompt)}`.slice(0, 70) }),
            ),
          })]
        : []),

      Context({ children: `Any other model: \`@patch use <model-id>\`  ·  ${models.length} available` }),
      Context({
        children: "Only models supporting JSON mode are listed — the agents validate every response against a schema.",
      }),
    ],
  });
}

/** Confirmation after a pick, with what it costs and what it affects. */
export function modelSetCard({ agent, model, pricing }) {
  return Message({
    accent: "#10b981",
    fallbackText: `Model set: ${model}`,
    children: [
      Header({ children: "Model updated" }),
      Section({
        children: Markdown({
          children: `*${agent === "__all__" ? "All agents" : agent}* now use \`${model}\``,
        }),
      }),
      Fields({
        children: [
          Field({ label: "Input", children: perMillion(pricing?.prompt) }),
          Field({ label: "Output", children: perMillion(pricing?.completion) }),
        ],
      }),
      Context({ children: "Takes effect on the next nomination." }),
    ],
  });
}

/* ── Workspace-originated detections ───────────────────────────────────────── */

/**
 * Someone edited a document in Ambiguous and PATCH noticed. It has NOT searched
 * or propagated anything — this card is the nomination gate (ADR-0006), the same
 * gate a Slack mention goes through, just reached from the other direction.
 */
export function workspaceChangeCard({ detections, onNominate, onDismiss }) {
  return Message({
    accent: "#f59e0b",
    fallbackText: `${detections.length} workspace edit(s) look like truth changes`,
    children: [
      Header({
        children: detections.length === 1
          ? "A workspace edit looks like a truth change"
          : `${detections.length} workspace edits look like truth changes`,
      }),
      Section({
        children: Markdown({
          children: "Edited directly in Ambiguous. Nothing has been searched or propagated.",
        }),
      }),

      Table({
        columns: [{ header: "Document" }, { header: "Change" }, { header: "Conf." }],
        children: detections.map((d) =>
          Row({
            children: [
              Cell({ children: d.docTitle.slice(0, 34) }),
              Cell({ children: `${d.previousValue} → ${d.newValue}` }),
              Cell({ children: `${Math.round(d.confidence * 100)}%` }),
            ],
          }),
        ),
      }),

      Divider({}),
      Section({ children: Markdown({ children: "*Nominate one to see where the old value spread*" }) }),
      Actions({
        children: [
          ...detections.slice(0, 4).map((d) =>
            Button({ value: d.id, onClick: onNominate, children: `${d.previousValue} → ${d.newValue}`.slice(0, 70) }),
          ),
          Button({ value: "dismiss", onClick: onDismiss, children: "Dismiss all" }),
        ],
      }),
      Context({
        children: "PATCH watches the workspace but never repairs on its own — a human nominates.",
      }),
    ],
  });
}

/**
 * A refusal that is actionable rather than a dead end: it says what was blocked,
 * what the person's role is, and who can do it.
 */
export function deniedCard({ action, role, admins }) {
  return Message({
    accent: "#f59e0b",
    fallbackText: `Not permitted: ${action}`,
    children: [
      Header({ children: "That needs a higher role" }),
      Section({
        children: Markdown({
          children: `*${action}* is restricted. You are a *${role}*, which can see everything PATCH finds but cannot start a search or cause a write.`,
        }),
      }),
      ...(admins.length
        ? [Fields({ children: [Field({ label: "Ask one of", children: admins.join(", ") })] })]
        : []),
      Context({ children: "Roles live in patch.config.json." }),
    ],
  });
}

/**
 * Who you are and what that permits. Shows the Slack user id prominently because
 * it is the reliable key for patch.config.json — a display name only resolves
 * when the provider profile lookup succeeds, and it often does not.
 */
export function roleCard({ identity, role, permissions, roster, isAdmin }) {
  const ACCENT = { admin: "#10b981", operator: "#6366f1" };
  const LABEL = {
    nominate: "Nominate a truth change",
    confirm: "Confirm and run the pipeline",
    approve_repairs: "Approve repairs",
    change_models: "Change model routing",
    dismiss: "Dismiss workspace detections",
  };

  return Message({
    accent: ACCENT[role] ?? "#94a3b8",
    fallbackText: `You are ${role === "viewer" ? "a viewer" : `an ${role}`}`,
    children: [
      Header({ children: `You are ${role === "viewer" ? "a viewer" : role === "admin" ? "an admin" : "an operator"}` }),

      Table({
        columns: [{ header: "Action" }, { header: "Allowed" }],
        children: Object.entries(LABEL).map(([perm, label]) =>
          Row({
            children: [
              Cell({ children: label }),
              Cell({ children: permissions[perm] ? "✅ yes" : "— no" }),
            ],
          }),
        ),
      }),

      Context({
        children: role === "viewer"
          ? "You can see everything PATCH finds. Acting is restricted so that being in the channel is not enough to cause a write."
          : "Viewing is open to everyone — the audit trail is only useful if the team can read it.",
      }),

      Divider({}),
      Fields({
        children: [
          Field({ label: "Your Slack id", children: `\`${identity.id ?? "unknown"}\`` }),
          ...(identity.email ? [Field({ label: "Email", children: identity.email })] : []),
        ],
      }),

      ...(isAdmin && roster.length
        ? [
            Section({ children: Markdown({ children: "*Who holds what*" }) }),
            Table({
              columns: [{ header: "Role" }, { header: "Members" }],
              children: roster.map((r) =>
                Row({
                  children: [
                    Cell({ children: r.role }),
                    Cell({ children: r.members.length ? r.members.join(", ").slice(0, 60) : "— none —" }),
                  ],
                }),
              ),
            }),
            Context({ children: "Add someone by putting their Slack id in patch.config.json, then restart the listener." }),
          ]
        : [Context({ children: "Roles live in patch.config.json." })]),
    ],
  });
}
