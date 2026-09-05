"use client";

import { useRef, useState } from "react";
import { useWhepPlayer } from "@/hooks/use-whep-player";
import { LiveBadge } from "@/components/live-badge";
import { ConnectionStatus } from "@/components/connection-status";
import { LoadingSpinner } from "@/components/loading-spinner";
import { CameraOffline } from "@/components/camera-offline";
import { PlayerControls } from "@/components/player-controls";

export function CameraViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const { status, lastAttemptAt, attempts, retryNow } = useWhepPlayer(videoRef, {
    logScope: "cam",
  });

  const isConnected = status === "connected";
  const isFirstConnecting = status === "connecting" && attempts <= 1;

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className={`h-full w-full object-contain transition-opacity duration-500 ${
            isConnected ? "opacity-100" : "opacity-0"
          }`}
        />

        {isFirstConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
            <LoadingSpinner label="Connecting to camera…" />
          </div>
        )}

        {!isFirstConnecting && !isConnected && (
          <CameraOffline lastAttemptAt={lastAttemptAt} onRetry={retryNow} />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 sm:p-4">
          <LiveBadge active={isConnected} />
          <div className="pointer-events-auto">
            <PlayerControls
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((m) => !m)}
              videoRef={videoRef}
            />
          </div>
        </div>
      </div>

      <ConnectionStatus status={status} lastAttemptAt={lastAttemptAt} />
    </div>
  );
}
