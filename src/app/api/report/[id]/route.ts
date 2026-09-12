import { NextResponse } from "next/server";

/** WORKSTREAM A — issue #10. Serve a stored InfectionReport. `latest` = most recent. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(
    { error: "not implemented", detail: `GET /api/report/${id} — see issue #10` },
    { status: 501 },
  );
}
