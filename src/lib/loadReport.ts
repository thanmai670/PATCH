import fixture from "../../fixtures/atlas-infection.json";
import { InfectionReport } from "@/contract";

/**
 * Single source of truth for "where does the report come from".
 *
 * Workstream B: you never need to change this. `?fixture=1` (the default) always works.
 * Workstream A: when the pipeline is live, `?fixture=0` hits /api/report instead.
 */
export async function loadReport(opts: {
  fixture: boolean;
  reportId?: string;
}): Promise<InfectionReport> {
  if (opts.fixture) {
    return InfectionReport.parse(fixture);
  }
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/report/${opts.reportId ?? "latest"}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    // Never let a dead pipeline blank the demo screen.
    return InfectionReport.parse(fixture);
  }
  return InfectionReport.parse(await res.json());
}
