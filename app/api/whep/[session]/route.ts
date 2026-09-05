import { NextResponse, type NextRequest } from "next/server";
import { getBasicAuthHeader } from "@/lib/env";
import { decodeSessionUrl } from "@/lib/whep-session";
import { logWhep, logWhepError } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ session: string }> };

/** Ends the WHEP session in MediaMTX when the player disconnects/unmounts. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { session } = await params;
  try {
    const sessionUrl = decodeSessionUrl(session);
    logWhep("session terminate", { sessionUrl });
    await fetch(sessionUrl, {
      method: "DELETE",
      headers: { ...getBasicAuthHeader() },
      keepalive: true,
    }).catch((err) => logWhepError("session terminate fetch failed", err, { sessionUrl }));
  } catch (err) {
    logWhepError("failed to terminate session", err);
  }
  return new NextResponse(null, { status: 204 });
}

/** Forwards trickle-ICE fragments, in case a future MediaMTX version needs them. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { session } = await params;
  try {
    const sessionUrl = decodeSessionUrl(session);
    const body = await request.text();
    const upstream = await fetch(sessionUrl, {
      method: "PATCH",
      headers: {
        "Content-Type":
          request.headers.get("content-type") || "application/trickle-ice-sdpfrag",
        ...getBasicAuthHeader(),
      },
      body,
      cache: "no-store",
    });
    return new NextResponse(await upstream.text(), { status: upstream.status });
  } catch (err) {
    console.error("[whep] trickle ICE forward failed", err);
    return new NextResponse(null, { status: 502 });
  }
}
