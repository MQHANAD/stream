# Folder Structure

```
stream/
├── app/                          # Next.js App Router
│   ├── layout.tsx                 # Root layout (server component, dark theme)
│   ├── globals.css                # Tailwind + base styles
│   ├── page.tsx                   # "/" → redirects to "/cam"
│   ├── robots.ts                  # Disallows all crawling (private app)
│   ├── error.tsx                  # Route-segment error boundary
│   ├── global-error.tsx           # Root layout error boundary
│   ├── cam/
│   │   ├── page.tsx                # The /cam landing page (server component)
│   │   ├── loading.tsx             # Suspense fallback
│   │   └── error.tsx               # /cam-specific error boundary
│   ├── api/
│   │   ├── whep/
│   │   │   ├── route.ts            # POST: proxies the WHEP SDP offer to MediaMTX
│   │   │   └── [session]/
│   │   │       └── route.ts        # PATCH/DELETE: proxies session lifecycle calls
│   │   └── diagnostics/
│   │       └── route.ts            # GET: reachability/path-status checks for /cam/debug
│   └── cam/
│       └── debug/
│           └── page.tsx            # Live WHEP/ICE/WebRTC diagnostics page
│
├── components/                   # Reusable UI building blocks
│   ├── camera-viewer.tsx          # Client component: orchestrates the player
│   ├── live-badge.tsx             # Pulsing "LIVE" badge
│   ├── connection-status.tsx      # Status dot + label + last attempt
│   ├── live-timestamp.tsx         # Self-updating "Xs ago" text
│   ├── loading-spinner.tsx        # Apple-style spinner
│   ├── camera-offline.tsx         # "Camera Offline" state + retry button
│   ├── player-controls.tsx        # Mute / fullscreen buttons
│   ├── config-error.tsx           # Friendly missing-env-var screen
│   └── debug/                     # /cam/debug sections
│       ├── debug-card.tsx          # Shared card/row/status-dot primitives
│       ├── reachability-section.tsx # MediaMTX/WHEP/path reachability
│       ├── connection-section.tsx  # Live PC/ICE/signaling state + preview
│       ├── candidates-section.tsx  # Local candidates + candidate pairs
│       ├── stats-section.tsx       # getStats() inbound-rtp dump
│       ├── environment-section.tsx # Browser support + network context
│       ├── log-viewer.tsx          # Live event log
│       └── debug-panel.tsx         # Orchestrates the above
│
├── hooks/
│   └── use-whep-player.ts         # WebRTC/WHEP connection + auto-reconnect state machine,
│                                   # with full ICE/PC/signaling event logging
│
├── lib/
│   ├── env.ts                     # Server-only env var access (never reaches the client)
│   ├── mediamtx-url.ts            # Resolves the WHEP URL per-request (no hardcoded localhost)
│   ├── network-context.ts         # Classifies a hostname: local/tailscale/lan/reverse-proxy/public
│   ├── diagnostics.ts             # Server-side MediaMTX/WHEP/API reachability probes
│   ├── server-log.ts              # Structured console logging for WHEP API routes
│   ├── client-logger.ts           # Browser-side pub/sub log ring buffer (feeds /cam/debug)
│   ├── webrtc-stats.ts            # Parses RTCStatsReport into candidate pairs/inbound-rtp
│   ├── browser-support.ts         # Client-side WebRTC/browser capability detection
│   ├── whep-session.ts            # Encodes/decodes the MediaMTX session URL
│   └── format.ts                  # Relative time formatting
│
├── types/
│   └── stream.ts                  # Shared TypeScript types
│
├── middleware.ts                  # HTTP Basic Auth for the entire app
│
├── mediamtx/
│   └── mediamtx.yml               # Production MediaMTX config for Docker/self-host
│
├── docs/                          # This documentation set
│   ├── INSTALLATION.md
│   ├── VERCEL_DEPLOYMENT.md
│   ├── CLOUDFLARE_TUNNEL.md
│   ├── TAILSCALE.md
│   ├── MEDIAMTX_CONFIG.md
│   ├── OBS_SETUP.md
│   ├── FOLDER_STRUCTURE.md
│   └── ENVIRONMENT_VARIABLES.md
│
├── public/                        # Static assets (empty by default)
├── Dockerfile                     # Multi-stage production build of the Next.js app
├── docker-compose.yml             # Full self-host stack: mediamtx + web
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
│
├── mediamtx.exe                   # Your existing local Windows MediaMTX binary (dev only)
├── mediamtx.yml                   # Your existing local MediaMTX config (dev only)
└── auto.crt / auto.key            # Self-signed certs from your local MediaMTX install
```

## Why the WHEP proxy exists

The resolved MediaMTX URL (see `lib/mediamtx-url.ts`) and `CAM_USERNAME`/
`CAM_PASSWORD` are read **only** inside `app/api/whep/route.ts` and
`lib/env.ts` (both server-only). The browser never receives the real
MediaMTX URL or credentials - it only ever talks to `/api/whep` on the
same origin. MediaMTX responds with an SDP answer whose ICE candidates
point at your public MediaMTX host, so the actual video/audio (RTP) still
flows directly between the browser and MediaMTX; only the
signaling handshake is proxied through Next.js.
