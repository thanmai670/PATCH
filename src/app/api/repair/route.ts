import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { InfectionReport, RepairPlan } from "@/contract";
import { executor } from "@/agents/executor";

/**
 * Accept an approved RepairPlan and execute it against the real workspace.
 *
 * Nothing reaches Ambiguous without an approved plan (ADR-0006), and the executor
 * refuses in-place edits to historical or irreversible artefacts even if asked.
 */
const LIVE = "fixtures/live-report.json";

export async function POST(req: Request) {
  const plan = RepairPlan.parse(await req.json());

  const path = existsSync(LIVE) ? LIVE : "fixtures/atlas-infection.json";
  const report = InfectionReport.parse(JSON.parse(readFileSync(path, "utf8")));

  if (report.reportId !== plan.reportId) {
    return NextResponse.json(
      { error: `plan targets ${plan.reportId}, loaded report is ${report.reportId}` },
      { status: 409 },
    );
  }

  const result = await executor(plan, report.nodes, {
    previousValue: report.change.previousValue,
    newValue: report.change.newValue,
  });
  return NextResponse.json(result);
}
