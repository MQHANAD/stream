export type PlayerStatus = "connecting" | "connected" | "offline";

export interface WhepPlayerState {
  status: PlayerStatus;
  lastAttemptAt: Date | null;
  attempts: number;
}

export interface LocalCandidateInfo {
  type: RTCIceCandidateType | "unknown";
  protocol: string;
  address: string;
  port: number;
  raw: string;
}
