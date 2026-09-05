"use client";

import type { BrowserSupport } from "@/lib/browser-support";
import type { NetworkContext } from "@/lib/network-context";
import { NETWORK_CONTEXT_LABEL } from "@/lib/network-context";
import { DebugCard, DebugRow, StatusDot } from "@/components/debug/debug-card";

export function EnvironmentSection({
  support,
  hostname,
  networkContext,
}: {
  support: BrowserSupport | null;
  hostname: string;
  networkContext: NetworkContext;
}) {
  return (
    <DebugCard title="Browser support & network">
      <div className="flex flex-col gap-1">
        <DebugRow label="Accessed via" value={hostname} />
        <DebugRow label="Detected network" value={NETWORK_CONTEXT_LABEL[networkContext]} />
        {support && (
          <>
            <DebugRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot ok={support.hasRTCPeerConnection} /> RTCPeerConnection
                </span>
              }
              value={support.hasRTCPeerConnection ? "supported" : "NOT supported"}
            />
            <DebugRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot ok={support.hasAddTransceiver} /> addTransceiver
                </span>
              }
              value={support.hasAddTransceiver ? "supported" : "NOT supported"}
            />
            <DebugRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot ok={support.hasGetStats} /> getStats
                </span>
              }
              value={support.hasGetStats ? "supported" : "NOT supported"}
            />
            <DebugRow label="Secure context (HTTPS)" value={support.isSecureContext ? "yes" : "no"} />
            <DebugRow label="Platform" value={support.platform} />
            <DebugRow label="User agent" value={support.userAgent} />
          </>
        )}
        {!support?.isSecureContext && (
          <div className="mt-1 rounded-lg bg-white/5 p-2 text-[11px] text-neutral-400">
            Plain HTTP is fine for WebRTC playback (this app does not capture camera/mic in the
            browser). Some browsers only restrict getUserMedia and a few newer APIs to HTTPS, not
            RTCPeerConnection itself.
          </div>
        )}
      </div>
    </DebugCard>
  );
}
