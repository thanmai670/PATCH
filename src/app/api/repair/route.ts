import { NextResponse } from "next/server";

/** WORKSTREAM A — issue #10. Accept a RepairPlan, run the executor, return ExecutionReport. */
export async function POST(req: Request) {
  const plan = await req.json();
  console.log("[/api/repair] received plan:", JSON.stringify(plan, null, 2));
  return NextResponse.json(
    { error: "not implemented", detail: "POST /api/repair — see issue #10" },
    { status: 501 },
  );
}
