import "server-only";
import {
  resolveMediaMtxApiOrigins,
  resolveMediaMtxOrigin,
  resolveStreamUrl,
  type HeadersLike,
  type ResolvedStreamUrl,
} from "@/lib/mediamtx-url";

export interface ReachabilityCheck {
  reachable: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
}

export interface PathStatus {
  checked: boolean;
  found?: boolean;
  ready?: boolean;
  readerCount?: number;
  trackCount?: number;
  raw?: unknown;
  error?: string;
}

export interface MediaMtxDiagnostics {
  resolved: ResolvedStreamUrl;
  streamPathName: string;
  mediamtx: ReachabilityCheck;
  whep: ReachabilityCheck;
  api: ReachabilityCheck & { enabled: boolean; origin?: string };
  pathStatus: PathStatus;
  timestamp: string;
}

interface TimedFetchResult {
  ok: boolean;
  status?: number;
  latencyMs: number;
  error?: string;
  body?: string;
}

async function timedFetch(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<TimedFetchResult> {
  const { timeoutMs = 4000, ...rest } = init;
  const start = Date.now();
  try {
    const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    const body = await res.text().catch(() => undefined);
    return { ok: true, status: res.status, latencyMs: Date.now() - start, body };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: describeFetchError(err) };
  }
}

function describeFetchError(err: unknown): string {
  if (err instanceof DOMException && err.name === "TimeoutError") {
    return "Timed out waiting for a response. The host/port is likely unreachable (wrong address, firewall, or MediaMTX not running).";
  }
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: { code?: string } }).cause;
    if (cause?.code === "ECONNREFUSED") {
      return "Connection refused - nothing is listening on that host/port. Is MediaMTX running?";
    }
    if (cause?.code === "ENOTFOUND" || cause?.code === "EAI_AGAIN") {
      return "DNS lookup failed - the hostname could not be resolved.";
    }
    if (cause?.code === "ETIMEDOUT" || cause?.code === "EHOSTUNREACH" || cause?.code === "ENETUNREACH") {
      return "Host unreachable - check network routing (e.g. is Tailscale connected and running on this device?).";
    }
    return err.message;
  }
  return String(err);
}

/** Given ".../cam/whep", returns "cam" - the MediaMTX path name. */
export function extractPathName(streamUrl: string): string {
  const { pathname } = new URL(streamUrl);
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "";
  if (segments[segments.length - 1] === "whep") {
    return segments.slice(0, -1).join("/");
  }
  return segments.join("/");
}

/**
 * Runs every check the /cam/debug page needs, server-side:
 *   1. Is the MediaMTX host:port reachable at all (HTTP-level TCP check)?
 *   2. Does the WHEP endpoint itself respond (proves the WebRTC listener,
 *      not just the port, is alive)?
 *   3. If MediaMTX's control API is enabled, is the specific path ("cam")
 *      actually being published to right now?
 *
 * Every failure captures a concrete reason instead of a generic boolean,
 * per the "if MediaMTX is unreachable, display exactly why" requirement.
 */
export async function runMediaMtxDiagnostics(headers: HeadersLike): Promise<MediaMtxDiagnostics> {
  const resolved = resolveStreamUrl(headers);
  const origin = resolveMediaMtxOrigin(resolved);
  const apiOrigins = resolveMediaMtxApiOrigins(resolved);
  const pathName = extractPathName(resolved.url);

  const [baseCheck, whepCheck] = await Promise.all([
    timedFetch(`${origin}/`, { method: "GET" }),
    timedFetch(resolved.url, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: "",
    }),
  ]);

  const mediamtx: ReachabilityCheck = {
    reachable: baseCheck.ok,
    status: baseCheck.status,
    latencyMs: baseCheck.latencyMs,
    error: baseCheck.error,
  };

  const whep: ReachabilityCheck = {
    // Any real HTTP response (even 4xx/5xx) proves the WHEP listener is
    // up and answering - only a network-level failure counts as
    // "unreachable" here.
    reachable: whepCheck.ok,
    status: whepCheck.status,
    latencyMs: whepCheck.latencyMs,
    error: whepCheck.error,
  };

  let api: ReachabilityCheck & { enabled: boolean; origin?: string } = { enabled: false, reachable: false };
  let pathStatus: PathStatus = { checked: false };

  if (pathName) {
    let apiResult: TimedFetchResult | undefined;
    let triedOrigin = apiOrigins[0];

    // Try loopback first (matches MediaMTX's default localhost-only "api"
    // permission), then fall back to the resolved public/Tailscale host.
    for (const candidateOrigin of apiOrigins) {
      const result = await timedFetch(`${candidateOrigin}/v3/paths/get/${encodeURIComponent(pathName)}`);
      apiResult = result;
      triedOrigin = candidateOrigin;
      if (result.ok) break; // got a real HTTP response (even 401/404) - stop here
    }

    api = {
      enabled: Boolean(apiResult?.ok),
      reachable: Boolean(apiResult?.ok),
      status: apiResult?.status,
      latencyMs: apiResult?.latencyMs,
      error: apiResult?.error,
      origin: triedOrigin,
    };

    if (apiResult?.ok && apiResult.status === 200 && apiResult.body) {
      try {
        const parsed = JSON.parse(apiResult.body) as Record<string, unknown>;
        pathStatus = {
          checked: true,
          found: true,
          ready: Boolean(parsed.ready),
          readerCount: Array.isArray(parsed.readers) ? parsed.readers.length : undefined,
          trackCount: Array.isArray(parsed.tracks) ? parsed.tracks.length : undefined,
          raw: parsed,
        };
      } catch {
        pathStatus = { checked: true, error: "MediaMTX API returned a non-JSON response." };
      }
    } else if (apiResult?.ok && apiResult.status === 404) {
      pathStatus = {
        checked: true,
        found: false,
        error: `MediaMTX has no path named "${pathName}" yet - nothing has published to it. Start OBS/your encoder and try again.`,
      };
    } else if (apiResult?.ok && apiResult.status === 401) {
      pathStatus = {
        checked: true,
        error: `MediaMTX's control API at ${triedOrigin} rejected the request (401) - its "ips" allowlist for the "api" action doesn't include this address. This only affects path-level diagnostics, not playback. See docs/MEDIAMTX_CONFIG.md.`,
      };
    } else if (apiResult?.ok) {
      pathStatus = { checked: true, error: `MediaMTX API responded with HTTP ${apiResult.status}.` };
    } else {
      pathStatus = {
        checked: true,
        error: `MediaMTX's control API is not reachable (tried ${apiOrigins.join(", ")}: ${apiResult?.error ?? "unknown error"}). Enable "api: yes" in mediamtx.yml for path-level diagnostics - this does not affect video playback, which only needs the WHEP check above.`,
      };
    }
  }

  return {
    resolved,
    streamPathName: pathName,
    mediamtx,
    whep,
    api,
    pathStatus,
    timestamp: new Date().toISOString(),
  };
}
