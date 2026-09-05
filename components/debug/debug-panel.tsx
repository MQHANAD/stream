"use client";

import { useEffect, useRef, useState } from "react";
import { useWhepPlayer } from "@/hooks/use-whep-player";
import type { MediaMtxDiagnostics } from "@/lib/diagnostics";
import { classifyHost } from "@/lib/network-context";
import { detectBrowserSupport, type BrowserSupport } from "@/lib/browser-support";
import { summarizeStats, type StatsSummary } from "@/lib/webrtc-stats";
import { ReachabilitySection } from "@/components/debug/reachability-section";
import { ConnectionSection } from "@/components/debug/connection-section";
import { CandidatesSection } from "@/components/debug/candidates-section";
import { StatsSection } from "@/components/debug/stats-section";
import { EnvironmentSection } from "@/components/debug/environment-section";
import { LogViewer } from "@/components/debug/log-viewer";
import { DebugCard, DebugRow } from "@/components/debug/debug-card";

const STATS_POLL_MS = 2000;
const EMPTY_STATS: StatsSummary = { candidatePairs: [], selectedPair: null, inboundRtp: [] };

export function DebugPanel({
  initialDiagnostics,
  configuredStreamUrl,
}: {
  initialDiagnostics: MediaMtxDiagnostics;
  configuredStreamUrl: string | undefined;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const player = useWhepPlayer(videoRef, { logScope: "debug" });

  const [diagnostics, setDiagnostics] = useState(initialDiagnostics);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<StatsSummary>(EMPTY_STATS);
  const [support, setSupport] = useState<BrowserSupport | null>(null);
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    setSupport(detectBrowserSupport());
    setHostname(window.location.hostname);
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      const report = await player.getStats();
      if (report) setStats(summarizeStats(report));
    }, STATS_POLL_MS);
    return () => clearInterval(id);
  }, [player]);

  const refreshDiagnostics = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/diagnostics", { cache: "no-store" });
      if (res.ok) {
        setDiagnostics(await res.json());
      }
    } finally {
      setRefreshing(false);
    }
  };

  const networkContext = hostname ? classifyHost(hostname) : diagnostics.resolved.networkContext;

  return (
    <div className="flex flex-col gap-4">
      <DebugCard title="Configuration">
        <div className="flex flex-col gap-1">
          <DebugRow label="CAM_STREAM_URL (configured)" value={configuredStreamUrl ?? "(unset - auto-derived)"} />
        </div>
      </DebugCard>

      <ReachabilitySection diagnostics={diagnostics} onRefresh={refreshDiagnostics} refreshing={refreshing} />

      <ConnectionSection
        videoRef={videoRef}
        status={player.status}
        connectionState={player.connectionState}
        iceConnectionState={player.iceConnectionState}
        iceGatheringState={player.iceGatheringState}
        signalingState={player.signalingState}
        attempts={player.attempts}
        lastAttemptAt={player.lastAttemptAt}
        lastError={player.lastError}
        onRetry={player.retryNow}
      />

      <CandidatesSection
        localCandidates={player.localCandidates}
        candidatePairs={stats.candidatePairs}
        selectedPair={stats.selectedPair}
      />

      <StatsSection inboundRtp={stats.inboundRtp} />

      <EnvironmentSection support={support} hostname={hostname || "(loading)"} networkContext={networkContext} />

      <LogViewer />

      <p className="pb-8 text-center text-[11px] text-neutral-600">
        This page opens its own independent viewer session (separate from /cam), so it may show a
        second reader connected in MediaMTX while open.
      </p>
    </div>
  );
}
