"use client";

export interface BrowserSupport {
  userAgent: string;
  isSecureContext: boolean;
  hasRTCPeerConnection: boolean;
  hasGetStats: boolean;
  hasAddTransceiver: boolean;
  hasMediaDevices: boolean;
  platform: string;
}

export function detectBrowserSupport(): BrowserSupport {
  const hasRTCPeerConnection = typeof RTCPeerConnection !== "undefined";
  return {
    userAgent: navigator.userAgent,
    isSecureContext: window.isSecureContext,
    hasRTCPeerConnection,
    hasGetStats: hasRTCPeerConnection && typeof RTCPeerConnection.prototype.getStats === "function",
    hasAddTransceiver:
      hasRTCPeerConnection && typeof RTCPeerConnection.prototype.addTransceiver === "function",
    hasMediaDevices: typeof navigator.mediaDevices !== "undefined",
    platform: navigator.platform || "unknown",
  };
}
