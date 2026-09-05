import type { PlayerStatus } from "@/types/stream";
import { LiveTimestamp } from "@/components/live-timestamp";

const STATUS_CONFIG: Record<PlayerStatus, { label: string; dot: string }> = {
  connecting: { label: "Connecting…", dot: "bg-amber-400" },
  connected: { label: "Connected", dot: "bg-emerald-400" },
  offline: { label: "Reconnecting…", dot: "bg-red-500" },
};

export function ConnectionStatus({
  status,
  lastAttemptAt,
}: {
  status: PlayerStatus;
  lastAttemptAt: Date | null;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-neutral-400">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${config.dot} ${
            status !== "connected" ? "animate-pulse" : ""
          }`}
        />
        <span>{config.label}</span>
      </div>
      {lastAttemptAt && (
        <span className="text-xs text-neutral-500">
          Last attempt: <LiveTimestamp date={lastAttemptAt} />
        </span>
      )}
    </div>
  );
}
