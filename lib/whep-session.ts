import "server-only";

/**
 * The browser talks to /api/whep/[session], never directly to MediaMTX.
 * We encode the real (absolute) MediaMTX session-resource URL into an
 * opaque token so the client can round-trip it without ever seeing it.
 */
export function encodeSessionUrl(url: string): string {
  return Buffer.from(url, "utf-8").toString("base64url");
}

export function decodeSessionUrl(token: string): string {
  return Buffer.from(token, "base64url").toString("utf-8");
}
