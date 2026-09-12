/**
 * Live smoke test for the agent pipeline (#7). Runs the real 22 kW -> 18.5 kW scenario
 * against the seeded workspace and validates the output against the frozen contract.
 *
 *   npx tsx --env-file=.env.local scripts/run-pipeline.ts
 *   npx tsx --env-file=.env.local scripts/run-pipeline.ts --save   # write to fixtures/live-report.json
 */
import { runPipeline } from "../src/agents";
import { InfectionReport } from "../src/contract";
import { writeFileSync } from "node:fs";

/**
 * The nominated text comes from the caller. It used to be hardcoded here, which
 * meant Confirm in Slack ran the motor scenario no matter what the human actually
 * said - the card showed one change and the pipeline repaired another.
 */
const arg = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const DEFAULT_TEXT =
  "Supplier correction: the approved motor for Project Atlas is now 18.5 kW, not 22 kW. Please use the revised specification attached here.";

const nomination = {
  channel: arg("--channel") ?? "#project-atlas",
  messageTs: `${Math.floor(Date.now() / 1000)}.000100`,
  text: arg("--text") ?? DEFAULT_TEXT,
  threadText: [],
  author: arg("--author") ?? "Thanmai",
  attachments: [],
  permalink: null,
};

console.log(`nomination: ${nomination.text.slice(0, 120)}`);

(async () => {
  console.time("pipeline");
  const report = await runPipeline(nomination, (t) => {
    // Machine-readable marker the Slack listener streams and renders live.
    console.log(`@@AGENT ${JSON.stringify({ agent: t.agent, model: t.model, ms: t.durationMs, summary: t.summary })}`);
  });
  console.timeEnd("pipeline");

  InfectionReport.parse(report);
  console.log("\n✓ output validates against the frozen contract\n");

  console.log(`${report.change.subject}: ${report.change.previousValue} → ${report.change.newValue}`);
  console.log(`evidence: ${report.evidence.length} (${report.evidence.filter((e) => !e.supports).length} contradicting)\n`);

  for (const n of report.nodes) {
    console.log(`  ${n.status.padEnd(8)} ${n.disposition.padEnd(12)} ${n.surface.padEnd(20)} ${n.requiresHumanReview ? "[review] " : ""}${n.title}`);
    console.log(`    ${n.rationale}`);
  }

  console.log("\nsummary:", report.summary);
  console.log("\ntrace:");
  for (const t of report.trace) console.log(`  ${t.agent.padEnd(12)} ${String(t.durationMs).padStart(6)}ms  ${t.model}\n    ${t.summary}`);

  if (process.argv.includes("--save")) {
    writeFileSync("fixtures/live-report.json", JSON.stringify(report, null, 2));
    console.log("\nwrote fixtures/live-report.json");
  }
})().catch((e) => { console.error("\nPIPELINE FAILED:", e); process.exit(1); });
