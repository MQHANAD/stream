"use client";

export interface CandidateSummary {
  id: string;
  type: string;
  protocol?: string;
  address?: string;
  port?: number;
  candidateType?: string;
}

export interface CandidatePairSummary {
  id: string;
  state: string;
  nominated?: boolean;
  selected?: boolean;
  localCandidate?: CandidateSummary;
  remoteCandidate?: CandidateSummary;
  bytesSent?: number;
  bytesReceived?: number;
  currentRoundTripTime?: number;
}

export interface InboundRtpSummary {
  kind: string;
  bytesReceived?: number;
  packetsReceived?: number;
  packetsLost?: number;
  jitter?: number;
  framesDecoded?: number;
  framesPerSecond?: number;
  frameWidth?: number;
  frameHeight?: number;
}

export interface StatsSummary {
  candidatePairs: CandidatePairSummary[];
  selectedPair: CandidatePairSummary | null;
  inboundRtp: InboundRtpSummary[];
}

/** Flattens the RTCStatsReport map into the shapes the debug UI renders. */
export function summarizeStats(report: RTCStatsReport): StatsSummary {
  const candidates = new Map<string, CandidateSummary>();
  const pairs: CandidatePairSummary[] = [];
  const inboundRtp: InboundRtpSummary[] = [];
  let selectedPairIdFromTransport: string | undefined;

  report.forEach((stat) => {
    const s = stat as unknown as Record<string, unknown>;
    if (s.type === "local-candidate" || s.type === "remote-candidate") {
      candidates.set(s.id as string, {
        id: s.id as string,
        type: s.type as string,
        protocol: s.protocol as string | undefined,
        address: (s.address ?? s.ip) as string | undefined,
        port: s.port as number | undefined,
        candidateType: s.candidateType as string | undefined,
      });
    }
    if (s.type === "transport" && typeof s.selectedCandidatePairId === "string") {
      selectedPairIdFromTransport = s.selectedCandidatePairId;
    }
    if (s.type === "inbound-rtp") {
      inboundRtp.push({
        kind: s.kind as string,
        bytesReceived: s.bytesReceived as number | undefined,
        packetsReceived: s.packetsReceived as number | undefined,
        packetsLost: s.packetsLost as number | undefined,
        jitter: s.jitter as number | undefined,
        framesDecoded: s.framesDecoded as number | undefined,
        framesPerSecond: s.framesPerSecond as number | undefined,
        frameWidth: s.frameWidth as number | undefined,
        frameHeight: s.frameHeight as number | undefined,
      });
    }
  });

  report.forEach((stat) => {
    const s = stat as unknown as Record<string, unknown>;
    if (s.type === "candidate-pair") {
      pairs.push({
        id: s.id as string,
        state: s.state as string,
        nominated: s.nominated as boolean | undefined,
        selected: (s.selected as boolean | undefined) ?? s.id === selectedPairIdFromTransport,
        localCandidate: candidates.get(s.localCandidateId as string),
        remoteCandidate: candidates.get(s.remoteCandidateId as string),
        bytesSent: s.bytesSent as number | undefined,
        bytesReceived: s.bytesReceived as number | undefined,
        currentRoundTripTime: s.currentRoundTripTime as number | undefined,
      });
    }
  });

  const selectedPair =
    pairs.find((p) => p.selected) ?? pairs.find((p) => p.state === "succeeded") ?? null;

  return { candidatePairs: pairs, selectedPair, inboundRtp };
}
