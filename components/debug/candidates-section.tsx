"use client";

import type { LocalCandidateInfo } from "@/types/stream";
import type { CandidatePairSummary } from "@/lib/webrtc-stats";
import { DebugCard } from "@/components/debug/debug-card";

export function CandidatesSection({
  localCandidates,
  candidatePairs,
  selectedPair,
}: {
  localCandidates: LocalCandidateInfo[];
  candidatePairs: CandidatePairSummary[];
  selectedPair: CandidatePairSummary | null;
}) {
  return (
    <DebugCard title="ICE candidates">
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-neutral-400">
          Local candidates gathered ({localCandidates.length})
        </h3>
        {localCandidates.length === 0 ? (
          <p className="text-xs text-neutral-600">None yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/5">
            <table className="w-full min-w-[420px] text-left text-[11px]">
              <thead className="bg-white/5 text-neutral-500">
                <tr>
                  <th className="px-2 py-1 font-medium">Type</th>
                  <th className="px-2 py-1 font-medium">Proto</th>
                  <th className="px-2 py-1 font-medium">Address</th>
                  <th className="px-2 py-1 font-medium">Port</th>
                </tr>
              </thead>
              <tbody className="font-mono text-neutral-300">
                {localCandidates.map((c, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-2 py-1">{c.type}</td>
                    <td className="px-2 py-1">{c.protocol}</td>
                    <td className="px-2 py-1">{c.address}</td>
                    <td className="px-2 py-1">{c.port}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-neutral-400">
          Candidate pairs ({candidatePairs.length})
        </h3>
        {candidatePairs.length === 0 ? (
          <p className="text-xs text-neutral-600">
            None yet - stats populate once the peer connection starts checking candidates.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/5">
            <table className="w-full min-w-[560px] text-left text-[11px]">
              <thead className="bg-white/5 text-neutral-500">
                <tr>
                  <th className="px-2 py-1 font-medium">State</th>
                  <th className="px-2 py-1 font-medium">Selected</th>
                  <th className="px-2 py-1 font-medium">Local</th>
                  <th className="px-2 py-1 font-medium">Remote</th>
                  <th className="px-2 py-1 font-medium">RTT</th>
                </tr>
              </thead>
              <tbody className="font-mono text-neutral-300">
                {candidatePairs.map((p) => (
                  <tr key={p.id} className={`border-t border-white/5 ${p.selected ? "bg-emerald-500/10" : ""}`}>
                    <td className="px-2 py-1">{p.state}</td>
                    <td className="px-2 py-1">{p.selected ? "✓" : ""}</td>
                    <td className="px-2 py-1">
                      {p.localCandidate
                        ? `${p.localCandidate.candidateType} ${p.localCandidate.address}:${p.localCandidate.port}`
                        : "-"}
                    </td>
                    <td className="px-2 py-1">
                      {p.remoteCandidate
                        ? `${p.remoteCandidate.candidateType} ${p.remoteCandidate.address}:${p.remoteCandidate.port}`
                        : "-"}
                    </td>
                    <td className="px-2 py-1">
                      {p.currentRoundTripTime !== undefined ? `${Math.round(p.currentRoundTripTime * 1000)}ms` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedPair ? (
          <div className="rounded-lg bg-emerald-500/10 p-2 text-[11px] text-emerald-300">
            Connected via {selectedPair.localCandidate?.candidateType ?? "?"} ↔{" "}
            {selectedPair.remoteCandidate?.candidateType ?? "?"} (
            {selectedPair.remoteCandidate?.address}:{selectedPair.remoteCandidate?.port})
          </div>
        ) : (
          <div className="rounded-lg bg-white/5 p-2 text-[11px] text-neutral-500">
            No candidate pair selected yet.
          </div>
        )}
      </div>
    </DebugCard>
  );
}
