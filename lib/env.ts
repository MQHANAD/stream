import "server-only";

/**
 * Raw, unresolved CAM_STREAM_URL as configured (or undefined). Prefer
 * `resolveStreamUrl()` from lib/mediamtx-url.ts for the URL actually used
 * to reach MediaMTX - this is only for display purposes (e.g. showing the
 * configured-vs-resolved value on /cam/debug). Never pass the return value
 * to a Client Component.
 */
export function getConfiguredCamStreamUrl(): string | undefined {
  return process.env.CAM_STREAM_URL?.trim() || undefined;
}

export function getBasicAuthHeader(): Record<string, string> {
  const username = process.env.CAM_USERNAME;
  const password = process.env.CAM_PASSWORD;
  if (!username || !password) return {};
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}
