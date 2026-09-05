import { NextResponse, type NextRequest } from "next/server";
import { runMediaMtxDiagnostics } from "@/lib/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Backs the "Refresh" button on /cam/debug - same checks as the SSR pass on page load. */
export async function GET(request: NextRequest) {
  const diagnostics = await runMediaMtxDiagnostics(request.headers);
  return NextResponse.json(diagnostics);
}
