/**
 * Ambiguous as a SOURCE of truth changes, not only a target.
 *
 * Polls the workspace, compares each document against a stored snapshot, and when
 * a fact-shaped value changes it asks the interpreter whether that edit is a
 * truth change. Detections are written to .patch-pending.json for Slack to offer,
 * and announced in the workspace chat.
 *
 * It NOMINATES, it never repairs (ADR-0006). An edit is a candidate; a human
 * still confirms before anything is searched or written. Without that gate this
 * becomes an agent that rewrites your CRM because someone fixed a typo.
 *
 *   npx tsx --env-file=.env.local scripts/detect-edits.ts --snapshot   # baseline only
 *   npx tsx --env-file=.env.local scripts/detect-edits.ts             # detect once
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { listDocs, getDoc, listChatChannels, sendChatMessage } from "../src/adapters/ambiguous";
import { interpreter } from "../src/agents/interpreter";

const SNAPSHOT = ".patch-snapshots.json";
const PENDING = ".patch-pending.json";
const SNAPSHOT_ONLY = process.argv.includes("--snapshot");

type Snap = Record<string, { title: string; content: string }>;
type Pending = {
  id: string;
  docId: string;
  docTitle: string;
  before: string;
  after: string;
  subject: string;
  previousValue: string;
  newValue: string;
  confidence: number;
  detectedAt: string;
};

const read = <T,>(p: string, fallback: T): T => {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; }
};

/**
 * Documents come back as ProseMirror JSON, not markdown, so the whole body is a
 * single line and a line diff sees nothing. Flatten to one line per text node
 * before comparing.
 */
function plainText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return raw;
  let doc: unknown;
  try { doc = JSON.parse(trimmed); } catch { return raw; }

  const BLOCK = new Set(["paragraph", "heading", "listItem", "blockquote", "codeBlock", "tableRow"]);
  const lines: string[] = [];

  // Collect the text under one node without descending into nested blocks.
  const textOf = (node: any): string => {
    if (!node || typeof node !== "object") return "";
    if (node.type === "text") return String(node.text ?? "");
    if (!Array.isArray(node.content)) return "";
    return node.content.map(textOf).join("");
  };

  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (BLOCK.has(node.type)) {
      const t = textOf(node).trim();
      if (t) lines.push(t);
      return;                       // a block is one line; do not split it further
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(doc);
  return lines.filter((l) => l.trim()).join("\n");
}

/** The first line that differs, which is where an edited fact lives. */
function firstChangedLine(before: string, after: string): { before: string; after: string } | null {
  const a = before.split("\n");
  const b = after.split("\n");
  const bSet = new Set(b);
  const aSet = new Set(a);
  const removed = a.find((l) => l.trim() && !bSet.has(l));
  const added = b.find((l) => l.trim() && !aSet.has(l));
  if (!removed || !added) return null;
  return { before: removed.trim(), after: added.trim() };
}

/** Cheap pre-filter: an edit with no value-shaped token is prose, not a fact change. */
const VALUE = /\d[\d.,]*\s*(kW|kg|mm|V|weeks?|days?|months?|%|EUR|USD|GBP)|EN\s?\d{5}(:\d{4})?|\b[A-Z]{2,}-?\d{2,}\b/i;

async function main() {
  const docs = (await listDocs()).data ?? [];
  const snaps: Snap = read(SNAPSHOT, {});
  const next: Snap = {};
  const detections: Pending[] = [];

  for (const d of docs) {
    const full = await getDoc(d.id).catch(() => null);
    const content = plainText(
      typeof full?.content === "string" ? full.content : JSON.stringify(full?.content ?? ""),
    );
    next[d.id] = { title: d.title, content };

    if (SNAPSHOT_ONLY) continue;
    const prev = snaps[d.id];
    if (!prev || prev.content === content) continue;

    const line = firstChangedLine(prev.content, content);
    if (!line) continue;
    if (!VALUE.test(line.before) && !VALUE.test(line.after)) {
      console.log(`  · ${d.title}: edited, but no value-shaped change — ignoring`);
      continue;
    }

    console.log(`  ! ${d.title}`);
    console.log(`      - ${line.before}`);
    console.log(`      + ${line.after}`);

    // Hand the interpreter the edit as a sentence, so one agent decides what
    // counts as a truth change regardless of which trigger found it.
    const synthetic =
      `The document "${d.title}" was edited in the workspace. ` +
      `The line "${line.before}" was changed to "${line.after}".`;

    try {
      const { change } = await interpreter({
        channel: "ambiguous:workspace",
        messageTs: `${Math.floor(Date.now() / 1000)}.000000`,
        text: synthetic,
        threadText: [],
        author: "workspace edit",
        attachments: [],
        permalink: null,
      });
      detections.push({
        id: `pend_${d.id.slice(0, 8)}_${Date.now()}`,
        docId: d.id,
        docTitle: d.title,
        before: line.before,
        after: line.after,
        subject: change.subject,
        previousValue: change.previousValue,
        newValue: change.newValue,
        confidence: change.confidence,
        detectedAt: new Date().toISOString(),
      });
      console.log(`      -> truth change: ${change.previousValue} → ${change.newValue} (${change.confidence})`);
    } catch (e: any) {
      console.log(`      -> not a truth change${e?.notAChange ? "" : `: ${e?.message ?? e}`}`);
    }
  }

  writeFileSync(SNAPSHOT, JSON.stringify(next, null, 2));

  if (SNAPSHOT_ONLY) {
    console.log(`Baseline stored for ${Object.keys(next).length} documents.`);
    return;
  }

  if (detections.length === 0) {
    console.log("No truth changes detected.");
    return;
  }

  const pending: Pending[] = [...read<Pending[]>(PENDING, []), ...detections];
  writeFileSync(PENDING, JSON.stringify(pending, null, 2));

  // Speak where the work happened, as well as in Slack.
  try {
    const general = (await listChatChannels()).data?.find((c) => c.name === "general");
    if (general) {
      for (const d of detections) {
        await sendChatMessage(
          general.id,
          `**Possible truth change detected**\n\n` +
            `\`${d.docTitle}\` was edited: **${d.previousValue} → ${d.newValue}**\n\n` +
            `_${d.subject}_ · confidence ${Math.round(d.confidence * 100)}%\n\n` +
            `This has not been propagated. Nominate it in Slack with \`@patch changes\` to review where the old value spread.`,
        );
      }
      console.log(`Announced ${detections.length} detection(s) in workspace chat.`);
    }
  } catch (e: any) {
    console.log(`(workspace chat announce failed: ${e?.message ?? e})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
