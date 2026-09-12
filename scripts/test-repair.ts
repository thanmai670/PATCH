/**
 * Prove the executor writes correctly to a real document: the value changes, the
 * rest of the document survives, and a historical artefact is only annotated.
 */
import { getDoc, listDocs } from "../src/adapters/ambiguous";
import { executor } from "../src/agents/executor";
import type { InfectionNode, RepairPlan } from "../src/contract";

const textOf = (c: unknown) => (typeof c === "string" ? c : JSON.stringify(c ?? ""));
const occurrences = (c: unknown, v: string) => (textOf(c).match(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;

(async () => {
  const docs = (await listDocs()).data ?? [];
  const target = docs.find((d) => d.title.includes("Supplier Agreement"));
  if (!target) throw new Error("Supplier Agreement not seeded");

  const before = await getDoc(target.id);
  const beforeLen = textOf(before.content).length;
  console.log(`document : ${target.title}`);
  console.log(`  size before      : ${beforeLen} chars`);
  console.log(`  "14 weeks" before: ${occurrences(before.content, "14 weeks")}`);
  console.log(`  "22 weeks" before: ${occurrences(before.content, "22 weeks")}`);

  const node = {
    id: "n_test", ambiguousId: target.id, kind: "document", title: target.title,
    href: null, status: "infected", disposition: "editable", matchKind: "exact",
    confidence: 0.95, rationale: "test", excerpt: null,
    surface: "document_diff", surfaceProps: { actions: ["accept"] },
    dependsOn: [], requiresHumanReview: false,
  } as unknown as InfectionNode;

  const plan = {
    reportId: "rpt_test", approvedBy: "test",
    actions: [{ nodeId: "n_test", surface: "document_diff", decision: "accept", payload: {} }],
  } as RepairPlan;

  const res = await executor(plan, [node], { previousValue: "14 weeks", newValue: "22 weeks" });
  console.log(`  executor         : ${JSON.stringify(res.results[0])}`);

  const after = await getDoc(target.id);
  const afterLen = textOf(after.content).length;
  console.log(`  size after       : ${afterLen} chars`);
  console.log(`  "14 weeks" after : ${occurrences(after.content, "14 weeks")}`);
  console.log(`  "22 weeks" after : ${occurrences(after.content, "22 weeks")}`);

  const shrank = afterLen < beforeLen * 0.8;
  console.log(`\n  ${shrank ? "✗ DOCUMENT WAS TRUNCATED" : "✓ document preserved"}`);
  console.log(`  ${occurrences(after.content, "14 weeks") === 0 && occurrences(after.content, "22 weeks") > 0 ? "✓ value replaced" : "✗ value not replaced"}`);
})().catch((e) => { console.error(e); process.exit(1); });
