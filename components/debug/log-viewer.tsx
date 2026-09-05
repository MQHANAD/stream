"use client";

import { useEffect, useRef, useState } from "react";
import { getLogBuffer, subscribe, type LogEntry } from "@/lib/client-logger";
import { DebugCard } from "@/components/debug/debug-card";

const LEVEL_COLOR: Record<LogEntry["level"], string> = {
  info: "text-neutral-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

export function LogViewer() {
  const [entries, setEntries] = useState<LogEntry[]>(() => getLogBuffer());
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    return subscribe((entry) => {
      setEntries((prev) => [...prev.slice(-399), entry]);
    });
  }, []);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  return (
    <DebugCard
      title={`Event log (${entries.length})`}
      action={
        <label className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="accent-white"
          />
          Auto-scroll
        </label>
      }
    >
      <div
        ref={containerRef}
        className="h-64 overflow-y-auto rounded-lg bg-black/40 p-2 font-mono text-[11px] leading-relaxed"
      >
        {entries.length === 0 && <p className="text-neutral-600">Waiting for events…</p>}
        {entries.map((entry) => (
          <div key={entry.id} className={LEVEL_COLOR[entry.level]}>
            <span className="text-neutral-600">
              {new Date(entry.timestamp).toLocaleTimeString()}{" "}
            </span>
            <span className="text-neutral-500">[{entry.scope}]</span> {entry.message}
            {entry.data !== undefined && (
              <span className="text-neutral-600"> {safeStringify(entry.data)}</span>
            )}
          </div>
        ))}
      </div>
    </DebugCard>
  );
}

function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}
