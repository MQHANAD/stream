/**
 * Isomorphic (server + client) classification of a hostname into the kind
 * of network it's being reached over. Used to explain, in logs and on
 * /cam/debug, *why* a given MediaMTX URL was chosen and what kind of
 * reachability problems to expect.
 */
export type NetworkContext =
  | "local" // localhost / 127.0.0.1 - same machine
  | "tailscale" // 100.64.0.0/10 CGNAT range or *.ts.net MagicDNS name
  | "lan" // RFC1918 private ranges
  | "reverse-proxy" // request arrived via x-forwarded-* headers
  | "public"; // anything else (public domain/IP)

export function classifyHost(hostname: string): NetworkContext {
  const host = hostname.toLowerCase();

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return "local";
  }

  if (host.endsWith(".ts.net")) {
    return "tailscale";
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);

    if (a === 127) return "local";
    // Tailscale (and other CGNAT-based overlay networks) use 100.64.0.0/10
    if (a === 100 && b >= 64 && b <= 127) return "tailscale";
    if (a === 10) return "lan";
    if (a === 172 && b >= 16 && b <= 31) return "lan";
    if (a === 192 && b === 168) return "lan";
  }

  return "public";
}

export function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0";
}

export const NETWORK_CONTEXT_LABEL: Record<NetworkContext, string> = {
  local: "Local (same machine)",
  tailscale: "Tailscale",
  lan: "Local network (LAN)",
  "reverse-proxy": "Behind a reverse proxy",
  public: "Public internet",
};
