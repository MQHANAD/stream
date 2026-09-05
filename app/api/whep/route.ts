import { NextResponse, type NextRequest } from "next/server";
import { getBasicAuthHeader } from "@/lib/env";
import { resolveStreamUrl } from "@/lib/mediamtx-url";
import { encodeSessionUrl } from "@/lib/whep-session";
import { logWhep, logWhepError, summarizeSdp } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WHEP signaling proxy. The browser POSTs its SDP offer here; we forward
 * it to MediaMTX (with server-side credentials) and hand back the SDP
 * answer. The actual media (RTP) still flows directly between the
 * browser and MediaMTX - this route only ever sees signaling traffic.
 *
 * The MediaMTX URL is resolved per-request (see lib/mediamtx-url.ts)
 * instead of a single hardcoded value, so the same deployment works when
 * reached via localhost, LAN, Tailscale, or a reverse proxy.
 */
export async function POST(request: NextRequest) {
  const resolved = resolveStreamUrl(request.headers);

  logWhep("incoming request", {
    requestHost: resolved.requestHost,
    networkContext: resolved.networkContext,
    behindReverseProxy: resolved.behindReverseProxy,
    resolvedStreamUrl: resolved.url,
    urlSource: resolved.source,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (resolved.warning) {
    console.warn(`[whep] ${resolved.warning}`);
  }

  const offerSdp = await request.text();
  if (!offerSdp) {
    logWhep("rejected: empty SDP offer");
    return NextResponse.json({ error: "Missing SDP offer." }, { status: 400 });
  }

  logWhep("sdp offer", summarizeSdp(offerSdp));

  const startedAt = Date.now();
  try {
    const upstream = await fetch(resolved.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        ...getBasicAuthHeader(),
      },
      body: offerSdp,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const durationMs = Date.now() - startedAt;
    const body = await upstream.text();

    logWhep("upstream response", {
      status: upstream.status,
      durationMs,
      hasLocation: Boolean(upstream.headers.get("location")),
      bodyBytes: body.length,
    });

    if (!upstream.ok) {
      logWhep("upstream rejected offer", {
        status: upstream.status,
        body: body.slice(0, 500),
      });
      return new NextResponse(
        body ||
          (upstream.status === 404
            ? "MediaMTX has no active stream on this path. Is OBS publishing?"
            : "Camera is currently unreachable."),
        { status: upstream.status === 404 ? 503 : upstream.status }
      );
    }

    logWhep("sdp answer", summarizeSdp(body));

    const headers = new Headers({ "Content-Type": "application/sdp" });
    const location = upstream.headers.get("location");
    if (location) {
      const absoluteLocation = new URL(location, resolved.url).toString();
      headers.set("Location", `/api/whep/${encodeSessionUrl(absoluteLocation)}`);
    }

    logWhep("session established", { totalDurationMs: Date.now() - startedAt });

    return new NextResponse(body, { status: 201, headers });
  } catch (err) {
    logWhepError("failed to reach MediaMTX", err, {
      resolvedStreamUrl: resolved.url,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        error: "Unable to reach the camera stream server.",
        detail: err instanceof Error ? err.message : String(err),
        streamUrl: resolved.url,
      },
      { status: 502 }
    );
  }
}
