"use client";

import type { InboundRtpSummary } from "@/lib/webrtc-stats";
import { DebugCard, DebugRow } from "@/components/debug/debug-card";

export function StatsSection({ inboundRtp }: { inboundRtp: InboundRtpSummary[] }) {
  return (
    <DebugCard title="WebRTC stats">
      {inboundRtp.length === 0 ? (
        <p className="text-xs text-neutral-600">No inbound media yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {inboundRtp.map((rtp, i) => (
            <div key={i} className="flex flex-col gap-1">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">{rtp.kind}</h3>
              <DebugRow label="Bytes received" value={rtp.bytesReceived ?? "-"} />
              <DebugRow label="Packets received" value={rtp.packetsReceived ?? "-"} />
              <DebugRow label="Packets lost" value={rtp.packetsLost ?? "-"} />
              <DebugRow label="Jitter" value={rtp.jitter !== undefined ? rtp.jitter.toFixed(4) : "-"} />
              {rtp.kind === "video" && (
                <>
                  <DebugRow label="Frames decoded" value={rtp.framesDecoded ?? "-"} />
                  <DebugRow
                    label="FPS"
                    value={rtp.framesPerSecond !== undefined ? Math.round(rtp.framesPerSecond) : "-"}
                  />
                  <DebugRow
                    label="Resolution"
                    value={
                      rtp.frameWidth && rtp.frameHeight ? `${rtp.frameWidth}×${rtp.frameHeight}` : "-"
                    }
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </DebugCard>
  );
}
