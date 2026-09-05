import "server-only";

/**
 * Structured logging for server-side WHEP signaling (requirement: detailed
 * logging of WHEP HTTP requests, SDP offers/answers). Every line is
 * prefixed and JSON-safe so it's easy to grep in `next dev`/`next start`
 * output, Docker logs, or Vercel's function logs.
 */
export function logWhep(event: string, data?: Record<string, unknown>) {
  const line = `[whep] ${new Date().toISOString()} ${event}`;
  if (data) {
    console.log(line, JSON.stringify(data));
  } else {
    console.log(line);
  }
}

export function logWhepError(event: string, err: unknown, data?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(
    `[whep] ${new Date().toISOString()} ${event}`,
    JSON.stringify({ ...data, error: message })
  );
}

/** Small, log-safe summary of an SDP body - never logs the full SDP by default. */
export function summarizeSdp(sdp: string) {
  const lines = sdp.split(/\r?\n/);
  const mediaLines = lines.filter((l) => l.startsWith("m="));
  const ufrag = lines.find((l) => l.startsWith("a=ice-ufrag:"))?.split(":")[1];
  const candidateCount = lines.filter((l) => l.startsWith("a=candidate:")).length;
  const candidateTypes = Array.from(
    new Set(
      lines
        .filter((l) => l.startsWith("a=candidate:"))
        .map((l) => l.match(/ typ (\w+)/)?.[1])
        .filter(Boolean)
    )
  );

  return {
    bytes: sdp.length,
    media: mediaLines.map((l) => l.replace(/^m=/, "")),
    iceUfrag: ufrag,
    candidateCount,
    candidateTypes,
  };
}
