"use client";

/**
 * Tiny client-side pub/sub logger with an in-memory ring buffer. The
 * useWhepPlayer hook writes ICE/PC/signaling events here; /cam/debug
 * subscribes to render a live log viewer. Also mirrors everything to
 * console.* so `next dev`/browser devtools show it without the debug page
 * open.
 */
export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
}

type Listener = (entry: LogEntry) => void;

const MAX_BUFFER = 400;
const buffer: LogEntry[] = [];
const listeners = new Set<Listener>();
let nextId = 0;

export function log(scope: string, message: string, data?: unknown, level: LogLevel = "info") {
  const entry: LogEntry = { id: nextId++, timestamp: Date.now(), level, scope, message, data };

  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  for (const listener of listeners) listener(entry);

  const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (data !== undefined) {
    consoleFn(`[${scope}] ${message}`, data);
  } else {
    consoleFn(`[${scope}] ${message}`);
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLogBuffer(): LogEntry[] {
  return [...buffer];
}

export function clearLogBuffer() {
  buffer.length = 0;
}
