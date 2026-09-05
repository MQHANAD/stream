"use client";

import { LiveTimestamp } from "@/components/live-timestamp";

export function CameraOffline({
  lastAttemptAt,
  onRetry,
}: {
  lastAttemptAt: Date | null;
  onRetry: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
        <CameraOffIcon />
      </div>
      <h2 className="text-lg font-semibold text-white">Camera Offline</h2>
      <p className="max-w-xs text-sm text-neutral-400">
        We can&apos;t reach the stream right now. Retrying automatically every 5
        seconds.
      </p>
      {lastAttemptAt && (
        <p className="text-xs text-neutral-500">
          Last attempt: <LiveTimestamp date={lastAttemptAt} />
        </p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 active:scale-95"
      >
        Retry now
      </button>
    </div>
  );
}

function CameraOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6 text-neutral-400"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.5 6H16a2 2 0 0 1 2 2v6.5M6.5 6.5A2 2 0 0 0 6 8v10a2 2 0 0 0 2 2h9c.35 0 .68-.09.97-.25M21 8.5l-3 2v-1"
      />
    </svg>
  );
}
