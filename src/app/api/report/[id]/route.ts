import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { InfectionReport } from "@/contract";

/**
 * Serve a stored InfectionReport. `latest` returns the most recent live run.
 *
 * The UI defaults to the fixture (?fixture=1). This route backs ?fixture=0.
 */
const LIVE = "fixtures/live-report.json";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!existsSync(LIVE)) {
    return NextResponse.json(
      {
        error: "no live report yet",
        detail: "Run: npx tsx --env-file=.env.local scripts/run-pipeline.ts --save",
      },
      { status: 404 },
    );
  }

  const report = InfectionReport.parse(JSON.parse(readFileSync(LIVE, "utf8")));
  if (id !== "latest" && id !== report.reportId) {
    return NextResponse.json({ error: `no report ${id}` }, { status: 404 });
  }
  return NextResponse.json(report);
}
