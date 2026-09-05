"use client";

import type { RefObject } from "react";

export function PlayerControls({
  isMuted,
  onToggleMute,
  videoRef,
}: {
  isMuted: boolean;
  onToggleMute: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const handleFullscreen = () => {
    const el = videoRef.current;
    if (!el) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }

    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if ("webkitEnterFullscreen" in el) {
      (el as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/10 transition hover:bg-black/80 active:scale-95"
      >
        {isMuted ? <MuteIcon /> : <UnmuteIcon />}
      </button>
      <button
        type="button"
        onClick={handleFullscreen}
        aria-label="Toggle fullscreen"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/10 transition hover:bg-black/80 active:scale-95"
      >
        <FullscreenIcon />
      </button>
    </div>
  );
}

function MuteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6M21 9l-5 6" />
    </svg>
  );
}

function UnmuteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" strokeWidth={1.8} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5 6 9H3v6h3l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M18 6a9 9 0 0 1 0 12"
      />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" strokeWidth={1.8} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"
      />
    </svg>
  );
}
