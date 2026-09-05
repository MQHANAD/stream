"use client";

import type { RefObject } from "react";
import type { PlayerStatus } from "@/types/stream";
import { DebugCard, DebugRow, StatusDot } from "@/components/debug/debug-card";

export function ConnectionSection({
  videoRef,
  status,
  connectionState,
  iceConnectionState,
  iceGatheringState,
  signalingState,
  attempts,
  lastAttemptAt,
  lastError,
  onRetry,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: PlayerStatus;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  iceGatheringState: RTCIceGatheringState;
  signalingState: RTCSignalingState;
  attempts: number;
  lastAttemptAt: Date | null;
  lastError: string | null;
  onRetry: () => void;
}) {
  return (
    <DebugCard
      title="Live connection state"
      action={
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
        >
          Reconnect now
        </button>
      }
    >
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
      </div>

      <div className="flex flex-col gap-1">
        <DebugRow
          label={
            <span className="inline-flex items-center gap-1.5">
              <StatusDot ok={status === "connected"} /> Player status
            </span>
          }
          value={status}
        />
        <DebugRow label="Peer connection state" value={connectionState} />
        <DebugRow label="ICE connection state" value={iceConnectionState} />
        <DebugRow label="ICE gathering state" value={iceGatheringState} />
        <DebugRow label="Signaling state" value={signalingState} />
        <DebugRow label="Connect attempts" value={attempts} />
        <DebugRow label="Last attempt" value={lastAttemptAt ? lastAttemptAt.toLocaleTimeString() : "-"} />
        {lastError && (
          <div className="mt-1 rounded-lg bg-red-500/10 p-2 text-[11px] text-red-300">{lastError}</div>
        )}
      </div>
    </DebugCard>
  );
}
