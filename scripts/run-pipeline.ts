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

const nomination = {
  channel: "#project-atlas",
  messageTs: `${Math.floor(Date.now() / 1000)}.000100`,
  text: "Supplier correction: the approved motor for Project Atlas is now 18.5 kW, not 22 kW. Please use the revised specification attached here.",
  threadText: ["Is that the ATX-series unit?", "Yes — supplier bulletin TB-2026-114."],
  author: "Thanmai",
  attachments: [{ name: "TB-2026-114.pdf", url: "https://example-supplier.com/bulletins/tb-2026-114" }],
  permalink: null,
};

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
