import "server-only";
import { classifyHost, isLoopbackHost, type NetworkContext } from "@/lib/network-context";

/** Minimal shape both NextRequest.headers and next/headers' ReadonlyHeaders satisfy. */
export interface HeadersLike {
  get(name: string): string | null;
}

export interface ResolvedStreamUrl {
  /** The WHEP URL the app will actually call. */
  url: string;
  /** Whether it came from an explicit CAM_STREAM_URL or was derived from the request. */
  source: "explicit" | "derived";
  /** The hostname the incoming request was addressed to (after x-forwarded-host). */
  requestHost: string;
  /** How that request host was classified. */
  networkContext: NetworkContext;
  /** Set when an explicit CAM_STREAM_URL pointed at localhost/127.0.0.1 and was overridden. */
  warning?: string;
  /**
   * True only when x-forwarded-host names a *different* host than the Host
   * header this app actually received - i.e. a real intermediary (nginx,
   * Cloudflare Tunnel) relabeled the request. Next.js itself always sets
   * x-forwarded-host/-proto (identical to Host) even for direct requests,
   * so mere presence of those headers is NOT a reliable signal - only a
   * mismatch is.
   */
  behindReverseProxy: boolean;
}

/**
 * Resolves the MediaMTX WHEP URL for the *current request*, instead of a
 * single static value baked into an env var.
 *
 * Why: this app can be reached from very different networks in the same
 * deployment - localhost during dev, a LAN IP, a Tailscale IP/MagicDNS
 * name when traveling, or a public hostname behind a reverse proxy/tunnel.
 * A single hardcoded CAM_STREAM_URL (especially one pointing at
 * "localhost") only ever works for one of those. Since MediaMTX and this
 * app typically run on the same machine, the correct MediaMTX host is
 * almost always "whatever host the browser used to reach this app" - so
 * we derive it from the request's Host header by default.
 *
 * Precedence:
 *   1. CAM_STREAM_URL, if set AND it does not point at localhost/127.0.0.1
 *      /0.0.0.0 - this is the explicit override for setups where MediaMTX
 *      is NOT reachable at the same host as this app (e.g. this app is on
 *      Vercel, MediaMTX is exposed via Cloudflare Tunnel at a different
 *      hostname).
 *   2. Otherwise, derive `${CAM_MEDIAMTX_PROTOCOL}://${requestHost}:${CAM_MEDIAMTX_PORT}${CAM_STREAM_PATH}`
 *      using the host the browser actually connected to.
 */
export function resolveStreamUrl(headers: HeadersLike): ResolvedStreamUrl {
  const forwardedHost = headers.get("x-forwarded-host");
  const hostHeader = headers.get("host") || "localhost";
  // Next.js sets x-forwarded-host to a *copy* of Host on direct requests;
  // only a genuine proxy relabels it to something else.
  const behindReverseProxy = Boolean(forwardedHost) && stripPort(forwardedHost!) !== stripPort(hostHeader);

  const requestHost = stripPort(forwardedHost || hostHeader);
  const networkContext: NetworkContext = behindReverseProxy ? "reverse-proxy" : classifyHost(requestHost);

  const explicit = process.env.CAM_STREAM_URL?.trim();
  if (explicit) {
    let explicitHost = "";
    try {
      explicitHost = new URL(explicit).hostname;
    } catch {
      // malformed CAM_STREAM_URL - fall through to derivation below
    }

    if (explicitHost && !isLoopbackHost(explicitHost)) {
      return {
        url: explicit,
        source: "explicit",
        requestHost,
        networkContext,
        behindReverseProxy,
      };
    }
  }

  const protocol = process.env.CAM_MEDIAMTX_PROTOCOL?.trim() || "http";
  const port = process.env.CAM_MEDIAMTX_PORT?.trim() || "8889";
  const path = normalizePath(process.env.CAM_STREAM_PATH?.trim() || "/cam/whep");
  const derivedUrl = `${protocol}://${requestHost}:${port}${path}`;

  return {
    url: derivedUrl,
    source: "derived",
    requestHost,
    networkContext,
    behindReverseProxy,
    warning: explicit
      ? `CAM_STREAM_URL="${explicit}" points at localhost/127.0.0.1, which is only reachable from the machine running this app itself. Derived "${derivedUrl}" from the incoming request's Host header instead. Set CAM_STREAM_URL to an explicit non-localhost address to silence this.`
      : undefined,
  };
}

/** The MediaMTX host:port to probe for reachability (independent of the WHEP path). */
export function resolveMediaMtxOrigin(resolved: ResolvedStreamUrl): string {
  const url = new URL(resolved.url);
  return `${url.protocol}//${url.host}`;
}

/**
 * Candidate origins for MediaMTX's control API, in priority order.
 *
 * MediaMTX's default config restricts the `api` action to
 * 127.0.0.1/::1 (see authInternalUsers in mediamtx.yml) - a good,
 * secure-by-default choice. Since this Next.js server usually runs on the
 * same machine as MediaMTX, we try loopback first (matching that default
 * exactly, no config changes needed). Only if loopback is genuinely
 * unreachable (a split deployment, e.g. this app on Vercel) do we fall
 * back to the resolved public/Tailscale host - which requires widening
 * MediaMTX's `ips` allowlist for the `api` action (see
 * docs/MEDIAMTX_CONFIG.md).
 */
export function resolveMediaMtxApiOrigins(resolved: ResolvedStreamUrl): string[] {
  const url = new URL(resolved.url);
  const apiPort = process.env.CAM_MEDIAMTX_API_PORT?.trim() || "9997";
  const origins = [`http://127.0.0.1:${apiPort}`];
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    origins.push(`${url.protocol}//${url.hostname}:${apiPort}`);
  }
  return origins;
}

function stripPort(host: string): string {
  // IPv6 literals like [::1]:3000 - keep the bracketed form intact.
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end === -1 ? host : host.slice(0, end + 1);
  }
  return host.split(":")[0];
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}
