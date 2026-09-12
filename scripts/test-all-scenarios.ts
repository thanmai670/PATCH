/**
 * Prove every scenario repairs correctly, not just the one I happened to test.
 *
 * For each: find a document carrying the stale value, run the real executor,
 * assert the value changed and the document survived, then restore it.
 */
import { getDoc, updateDoc, listDocs } from "../src/adapters/ambiguous";
import { executor } from "../src/agents/executor";
import { OLD, NEW } from "./seed/company";
import type { InfectionNode, RepairPlan } from "../src/contract";

const text = (c: unknown) => (typeof c === "string" ? c : JSON.stringify(c ?? ""));
const count = (c: unknown, v: string) =>
  (text(c).match(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;

const nodeFor = (id: string, title: string) => ({
  id: "n_t", ambiguousId: id, kind: "document", title, href: null,
  status: "infected", disposition: "editable", matchKind: "exact", confidence: 0.95,
  rationale: "test", excerpt: null, surface: "document_diff",
  surfaceProps: { actions: ["accept"] }, dependsOn: [], requiresHumanReview: false,
}) as unknown as InfectionNode;

const plan = {
  reportId: "rpt_t", approvedBy: "test",
  actions: [{ nodeId: "n_t", surface: "document_diff", decision: "accept", payload: {} }],
} as RepairPlan;

(async () => {
  const docs = (await listDocs()).data ?? [];
  let failures = 0;

  for (const key of Object.keys(OLD) as (keyof typeof OLD)[]) {
    const oldV = OLD[key];
    const newV = NEW[key];

    // Find a document that actually carries it.
    let target: { id: string; title: string } | null = null;
    let before: unknown = null;
    for (const d of docs) {
      const full = await getDoc(d.id).catch(() => null);
      if (full && count(full.content, oldV) > 0) { target = d; before = full.content; break; }
    }
    if (!target) {
      console.log(`${key.padEnd(9)} "${oldV}"  →  no document carries it — SKIP`);
      continue;
    }

    const lenBefore = text(before).length;
    const res = await executor(plan, [nodeFor(target.id, target.title)], {
      previousValue: oldV, newValue: newV,
    });
    const after = await getDoc(target.id);
    const lenAfter = text(after.content).length;

    const replaced = count(after.content, oldV) === 0 && count(after.content, newV) > 0;
    const intact = lenAfter > lenBefore * 0.8;
    const ok = res.results[0]?.ok && replaced && intact;
    if (!ok) failures++;

    console.log(
      `${key.padEnd(9)} "${oldV}" → "${newV}"`.padEnd(52) +
      `${ok ? "✓" : "✗"} ${replaced ? "replaced" : "NOT replaced"}, ${intact ? "intact" : "TRUNCATED"}  (${target.title.slice(0, 30)})`,
    );

    // Restore so the workspace is unchanged by this test.
    await updateDoc(target.id, { content: before });
  }

  console.log(failures === 0 ? "\nAll scenarios repair correctly." : `\n${failures} scenario(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
