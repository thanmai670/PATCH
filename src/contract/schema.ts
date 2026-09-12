/**
 * PATCH CONTRACT — the boundary between Workstream A (agents) and Workstream B (UI).
 *
 * THIS FILE IS THE INTEGRATION POINT. Changing it breaks the other person.
 * If you need a change: post in the GitHub issue, agree, change it together.
 *
 * A produces these shapes. B consumes them. Until A's pipeline is live, B builds
 * against `fixtures/atlas-infection.json`, which validates against `InfectionReport`.
 */
import { z } from "zod";

/* ── Axis 1: does this artefact carry the stale fact? ─────────────────────── */
export const InfectionStatus = z.enum([
  "infected", // contains the stale literal value
  "exposed",  // semantically depends on it; no literal match
  "immune",   // checked, still correct
]);
export type InfectionStatus = z.infer<typeof InfectionStatus>;

/* ── Axis 2: what are we permitted to do about it? ────────────────────────── */
export const RepairDisposition = z.enum([
  "editable",     // safe to modify in place
  "historical",   // was true at the time; preserve, annotate only
  "irreversible", // already sent/published; never silently edit
]);
export type RepairDisposition = z.infer<typeof RepairDisposition>;

/* ── How did we link this artefact to the change? Drives trust display. ───── */
export const MatchKind = z.enum([
  "exact",    // literal string match on the old value
  "semantic", // embedding/meaning match, no literal
  "inferred", // agent reasoning only — lowest trust
]);
export type MatchKind = z.infer<typeof MatchKind>;

export const ArtefactKind = z.enum([
  "document", "crm_record", "task", "email_sent", "email_draft", "historical_document",
]);
export type ArtefactKind = z.infer<typeof ArtefactKind>;

/** Which generated repair surface B should render for this node. */
export const RepairSurfaceKind = z.enum([
  "document_diff",       // before/after text diff + accept/rewrite/except
  "field_change",        // compact CRM field replacement
  "dependency_decision", // "may affect cable sizing" — review vs auto-change
  "corrective_message",  // sent email -> draft a correction
  "preservation_notice", // historical -> annotate, don't edit
]);
export type RepairSurfaceKind = z.infer<typeof RepairSurfaceKind>;

export const SourceStatus = z.enum(["live", "cached", "unverified"]);

/* ── The fact that changed ────────────────────────────────────────────────── */
export const TruthChange = z.object({
  id: z.string(),
  subject: z.string(),            // "Drive motor specification"
  previousValue: z.string(),      // "22 kW"
  newValue: z.string(),           // "18.5 kW"
  confidence: z.number().min(0).max(1),
  announcedBy: z.string(),
  announcedAt: z.string(),
  project: z.string().nullable(),
  /** Slack origin — the 🩹 reaction target. Null when triggered from the UI. */
  patientZero: z.object({
    channel: z.string(),
    messageTs: z.string(),
    text: z.string(),
    permalink: z.string().nullable(),
  }).nullable(),
});
export type TruthChange = z.infer<typeof TruthChange>;

/* ── Exa output. Evidence never decides — it informs. ─────────────────────── */
export const Evidence = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().nullable(),
  publishedAt: z.string().nullable(),
  highlight: z.string(),          // the passage Exa surfaced
  sourceStatus: SourceStatus,
  supports: z.boolean(),          // false => this source CONTRADICTS the change
});
export type Evidence = z.infer<typeof Evidence>;

/* ── One affected workspace object ────────────────────────────────────────── */
export const InfectionNode = z.object({
  id: z.string(),
  /** Ambiguous resource id, e.g. "doc_8xk2m". Null for anything not yet created. */
  ambiguousId: z.string().nullable(),
  kind: ArtefactKind,
  title: z.string(),
  /** Deep link into the Ambiguous workspace, for the "open the real thing" moment. */
  href: z.string().nullable(),

  status: InfectionStatus,
  disposition: RepairDisposition,
  matchKind: MatchKind,
  confidence: z.number().min(0).max(1),

  /** Why the classifier landed here. Shown verbatim in the UI — keep it human. */
  rationale: z.string(),

  /** The stale text in context. Null when status is "exposed" (no literal hit). */
  excerpt: z.object({
    before: z.string(),
    after: z.string(),
    field: z.string().nullable(),   // CRM field name when kind is crm_record
  }).nullable(),

  /** Which generated surface B renders when this node is selected. */
  surface: RepairSurfaceKind,
  /** Free-form props for that surface. Shape depends on `surface` — see docs/ARCHITECTURE.md. */
  surfaceProps: z.record(z.unknown()),

  /** Edges into other nodes. "spread" = the fact travelled here from that node. */
  dependsOn: z.array(z.string()),

  /** Set when the classifier is not confident enough to act without a human. */
  requiresHumanReview: z.boolean(),
});
export type InfectionNode = z.infer<typeof InfectionNode>;

/* ── One agent's contribution to the trace. Rendered in the UI trace panel. ─ */
export const AgentTraceEntry = z.object({
  agent: z.enum([
    "interpreter", "evidence", "tracer", "classifier", "planner", "executor",
  ]),
  model: z.string(),               // the OpenRouter model id actually used
  startedAt: z.string(),
  durationMs: z.number(),
  summary: z.string(),             // one line, shown on stage
  tokensIn: z.number().nullable(),
  tokensOut: z.number().nullable(),
});
export type AgentTraceEntry = z.infer<typeof AgentTraceEntry>;

/* ── THE handoff object. A emits it, B renders it. ────────────────────────── */
export const InfectionReport = z.object({
  reportId: z.string(),
  change: TruthChange,
  evidence: z.array(Evidence),
  nodes: z.array(InfectionNode),
  trace: z.array(AgentTraceEntry),
  /** Counts B shows in the Slack summary card and the header. */
  summary: z.object({
    safeToUpdate: z.number(),
    requiresReview: z.number(),
    alreadyCommunicated: z.number(),
    preserveAsHistorical: z.number(),
  }),
  generatedAt: z.string(),
});
export type InfectionReport = z.infer<typeof InfectionReport>;

/* ── What B sends back when the human approves ────────────────────────────── */
export const RepairAction = z.object({
  nodeId: z.string(),
  surface: RepairSurfaceKind,
  /** "accept" | "rewrite" | "except" | "create_review" | "draft_correction" | "annotate" */
  decision: z.string(),
  /** Human edits to the proposed change, if any. */
  payload: z.record(z.unknown()),
});
export type RepairAction = z.infer<typeof RepairAction>;

export const RepairPlan = z.object({
  reportId: z.string(),
  approvedBy: z.string(),
  actions: z.array(RepairAction),
});
export type RepairPlan = z.infer<typeof RepairPlan>;

/* ── What the executor reports back ───────────────────────────────────────── */
export const ExecutionResult = z.object({
  nodeId: z.string(),
  ok: z.boolean(),
  /** The Ambiguous write that happened, e.g. "PATCH /crm/deals/deal_3f9". */
  operation: z.string().nullable(),
  ambiguousId: z.string().nullable(),
  error: z.string().nullable(),
});
export type ExecutionResult = z.infer<typeof ExecutionResult>;

export const ExecutionReport = z.object({
  reportId: z.string(),
  results: z.array(ExecutionResult),
  auditRecordId: z.string().nullable(),
  completedAt: z.string(),
});
export type ExecutionReport = z.infer<typeof ExecutionReport>;
