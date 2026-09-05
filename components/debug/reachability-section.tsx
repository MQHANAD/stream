"use client";

import type { MediaMtxDiagnostics } from "@/lib/diagnostics";
import { NETWORK_CONTEXT_LABEL } from "@/lib/network-context";
import { DebugCard, DebugRow, StatusDot } from "@/components/debug/debug-card";

export function ReachabilitySection({
  diagnostics,
  onRefresh,
  refreshing,
}: {
  diagnostics: MediaMtxDiagnostics;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { resolved, mediamtx, whep, api, pathStatus, streamPathName } = diagnostics;

  return (
    <DebugCard
      title="MediaMTX reachability"
      action={
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
        >
          {refreshing ? "Checking…" : "Refresh"}
        </button>
      }
    >
      <div className="flex flex-col gap-1">
        <DebugRow
          label={
            <span className="inline-flex items-center gap-1.5">
              <StatusDot ok={mediamtx.reachable} /> MediaMTX host
            </span>
          }
          value={
            mediamtx.reachable
              ? `reachable (HTTP ${mediamtx.status ?? "?"}, ${mediamtx.latencyMs}ms)`
              : mediamtx.error ?? "unreachable"
          }
        />
        <DebugRow
          label={
            <span className="inline-flex items-center gap-1.5">
              <StatusDot ok={whep.reachable} /> WHEP endpoint
            </span>
          }
          value={
            whep.reachable
              ? `responding (HTTP ${whep.status ?? "?"}, ${whep.latencyMs}ms)`
              : whep.error ?? "unreachable"
          }
        />
        <DebugRow
          label={
            <span className="inline-flex items-center gap-1.5">
              <StatusDot ok={api.enabled ? pathStatus.found : undefined} /> Path &quot;
              {streamPathName || "?"}&quot;
            </span>
          }
          value={
            pathStatus.checked
              ? pathStatus.found
                ? `${pathStatus.ready ? "ready, publishing" : "exists, not ready"}${
                    pathStatus.readerCount !== undefined ? ` · ${pathStatus.readerCount} reader(s)` : ""
                  }`
                : pathStatus.error ?? "not found"
              : "not checked (no path name resolved)"
          }
        />
        <DebugRow label="Resolved stream URL" value={resolved.url} />
        <DebugRow
          label="URL source"
          value={
            resolved.source === "explicit"
              ? "explicit (CAM_STREAM_URL)"
              : "auto-derived from request host"
          }
        />
        <DebugRow label="Request host" value={resolved.requestHost} />
        <DebugRow label="Network context" value={NETWORK_CONTEXT_LABEL[resolved.networkContext]} />
        {resolved.behindReverseProxy && (
          <DebugRow label="Reverse proxy" value="x-forwarded-host/proto detected" />
        )}
        {resolved.warning && (
          <div className="mt-1 rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-300">
            {resolved.warning}
          </div>
        )}
        {!api.enabled && (
          <div className="mt-1 rounded-lg bg-white/5 p-2 text-[11px] text-neutral-400">
            {pathStatus.error ??
              'MediaMTX control API not reachable - enable "api: yes" in mediamtx.yml for path-level status (does not affect playback).'}
          </div>
        )}
      </div>
    </DebugCard>
  );
}
