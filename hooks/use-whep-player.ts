"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { LocalCandidateInfo, PlayerStatus } from "@/types/stream";
import { log } from "@/lib/client-logger";

const WHEP_ENDPOINT = "/api/whep";
const RECONNECT_DELAY_MS = 5000;
const ICE_GATHERING_TIMEOUT_MS = 4000;
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export interface UseWhepPlayerOptions {
  /** Distinguishes concurrent viewer sessions in logs, e.g. "cam" vs "debug". */
  logScope?: string;
}

export function useWhepPlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: UseWhepPlayerOptions = {}
) {
  const scope = options.logScope ?? "whep";

  const [status, setStatus] = useState<PlayerStatus>("connecting");
  const [lastAttemptAt, setLastAttemptAt] = useState<Date | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const [iceGatheringState, setIceGatheringState] = useState<RTCIceGatheringState>("new");
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>("new");
  const [signalingState, setSignalingState] = useState<RTCSignalingState>("stable");
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [localCandidates, setLocalCandidates] = useState<LocalCandidateInfo[]>([]);
  const [streamUrlInfo, setStreamUrlInfo] = useState<{ location: string | null }>({
    location: null,
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionUrlRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});

  const cleanupPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onicegatheringstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onicecandidateerror = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (sessionUrlRef.current) {
      const url = sessionUrlRef.current;
      sessionUrlRef.current = null;
      log(scope, "terminating WHEP session", { url });
      fetch(url, { method: "DELETE", keepalive: true }).catch(() => {});
    }
    setLocalCandidates([]);
  }, [scope]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || reconnectTimerRef.current) return;
    log(scope, `reconnecting in ${RECONNECT_DELAY_MS / 1000}s`);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current();
    }, RECONNECT_DELAY_MS);
  }, [scope]);

  const connect = useCallback(async () => {
    if (connectingRef.current || !mountedRef.current) return;
    connectingRef.current = true;

    cleanupPeerConnection();
    setStatus("connecting");
    setLastAttemptAt(new Date());
    setAttempts((n) => n + 1);
    setLastError(null);

    log(scope, "connect attempt starting");

    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (event) => {
        log(scope, `track received: ${event.track.kind}`, { id: event.track.id });
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const c = event.candidate;
          const info: LocalCandidateInfo = {
            type: (c.type as RTCIceCandidateType) || "unknown",
            protocol: c.protocol || "unknown",
            address: c.address || "unknown",
            port: c.port ?? 0,
            raw: c.candidate,
          };
          log(scope, `local ICE candidate: ${info.type} ${info.protocol} ${info.address}:${info.port}`, info);
          setLocalCandidates((prev) => [...prev, info]);
        } else {
          log(scope, "local ICE candidate gathering finished (null candidate)");
        }
      };

      pc.onicecandidateerror = (event) => {
        const e = event as RTCPeerConnectionIceErrorEvent;
        log(
          scope,
          `ICE candidate error: ${e.errorCode} ${e.errorText}`,
          { url: e.url, address: e.address, port: e.port },
          "warn"
        );
      };

      pc.onicegatheringstatechange = () => {
        setIceGatheringState(pc.iceGatheringState);
        log(scope, `ICE gathering state: ${pc.iceGatheringState}`);
      };

      pc.oniceconnectionstatechange = () => {
        setIceConnectionState(pc.iceConnectionState);
        const level = pc.iceConnectionState === "failed" ? "error" : "info";
        log(scope, `ICE connection state: ${pc.iceConnectionState}`, undefined, level);
      };

      pc.onsignalingstatechange = () => {
        setSignalingState(pc.signalingState);
        log(scope, `signaling state: ${pc.signalingState}`);
      };

      pc.onconnectionstatechange = () => {
        if (!mountedRef.current || pcRef.current !== pc) return;
        const state = pc.connectionState;
        setConnectionState(state);
        log(scope, `peer connection state: ${state}`, undefined, state === "failed" ? "error" : "info");

        if (state === "connected") {
          setStatus("connected");
        } else if (state === "failed" || state === "disconnected" || state === "closed") {
          setStatus("offline");
          setLastError((prev) => prev ?? `Connection ${state}`);
          scheduleReconnect();
        }
      };

      log(scope, "creating SDP offer (recvonly video+audio)");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      log(scope, "gathering ICE candidates before sending offer (non-trickle)");
      await waitForIceGathering(pc);

      const localSdp = pc.localDescription?.sdp;
      if (!localSdp) throw new Error("Failed to create local SDP offer");

      log(scope, "posting SDP offer to /api/whep", { bytes: localSdp.length });

      const response = await fetch(WHEP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: localSdp,
        cache: "no-store",
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw new Error(
          `WHEP signaling failed with status ${response.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ""}`
        );
      }

      const answerSdp = await response.text();
      const location = response.headers.get("Location") || response.headers.get("location");
      log(scope, "received SDP answer", { bytes: answerSdp.length, hasLocation: Boolean(location) });
      setStreamUrlInfo({ location });

      if (location) {
        sessionUrlRef.current = new URL(location, window.location.origin).toString();
      }

      if (!mountedRef.current || pcRef.current !== pc) return;

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      log(scope, "remote description applied, waiting for ICE/DTLS handshake");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(scope, `connect attempt failed: ${message}`, undefined, "error");
      if (mountedRef.current) {
        setStatus("offline");
        setLastError(message);
        scheduleReconnect();
      }
    } finally {
      connectingRef.current = false;
    }
  }, [cleanupPeerConnection, scheduleReconnect, videoRef, scope]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const retryNow = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    connectRef.current();
  }, []);

  const getStats = useCallback((): Promise<RTCStatsReport | null> => {
    if (!pcRef.current) return Promise.resolve(null);
    return pcRef.current.getStats();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connectRef.current();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      cleanupPeerConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    lastAttemptAt,
    attempts,
    retryNow,
    lastError,
    iceGatheringState,
    iceConnectionState,
    signalingState,
    connectionState,
    localCandidates,
    streamUrlInfo,
    getStats,
  };
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    }, ICE_GATHERING_TIMEOUT_MS);

    function check() {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    }

    pc.addEventListener("icegatheringstatechange", check);
  });
}
