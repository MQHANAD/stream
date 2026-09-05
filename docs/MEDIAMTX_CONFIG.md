# MediaMTX Configuration

There are two MediaMTX config files in this project:

- **`../mediamtx.yml`** (project root) - your existing local Windows
  install (`mediamtx.exe mediamtx.yml`). **This file was modified** as
  part of getting Tailscale access working (see "Changes made" below).
- **`mediamtx/mediamtx.yml`** - a trimmed config for the Docker/self-host
  deployment (`docker-compose.yml`), independent of the one above.

## Changes made to `../mediamtx.yml` (2026-08-05)

Investigating "video never appears over Tailscale" found MediaMTX simply
wasn't running (no listeners on any of its ports) - that alone explained
the symptom. While fixing that, three config changes were also made to
harden WebRTC connectivity over Tailscale/remote networks:

1. **`api: true`** (was `false`). Lets `/cam/debug` ask MediaMTX "is path
   X actually being published to right now?" instead of guessing from
   WHEP HTTP status codes alone. The existing `authInternalUsers` entry
   already restricts the `api` action to `127.0.0.1`/`::1` by default (a
   good security default MediaMTX ships with) - the Next.js diagnostics
   code (`lib/mediamtx-url.ts`'s `resolveMediaMtxApiOrigins()`) calls the
   API via `127.0.0.1` first for exactly this reason, since it runs on the
   same machine as MediaMTX. This does not open the API to your tailnet or
   LAN - it's still loopback-only unless you widen the `ips` list
   yourself.

2. **`webrtcAdditionalHosts: [100.82.102.91]`** (was `[]`). This machine's
   Tailscale IPv4 address (found via `Get-NetIPAddress`), explicitly added
   so MediaMTX always offers it as a WebRTC ICE candidate. This machine
   also has VirtualBox, Hyper-V, and an OpenVPN adapter, all of which
   `webrtcIPsFromInterfaces: true` (already on) also enumerates - explicit
   `webrtcAdditionalHosts` guarantees the one address that actually needs
   to work is always offered, rather than relying on interface enumeration
   picking the right one out of several. If your Tailscale IP ever changes
   (uncommon), update this line and restart MediaMTX, or run
   `tailscale ip -4` to check.

3. **`webrtcICEServers2: [{url: stun:stun.l.google.com:19302}]`** (was
   `[]`). Lets MediaMTX gather a server-reflexive candidate too. Not
   required for Tailscale itself (Tailscale routes `100.x.x.x` addresses
   at the network layer, independent of ICE/STUN), but relevant if you
   ever also reach the stream over a plain public network or tunnel.

None of these changes affect OBS/publishing - only WebRTC playback
(reading) is affected.

## Key settings

```yaml
rtmp: yes
rtmpAddress: :1935      # OBS/ffmpeg publishes here

webrtc: yes
webrtcAddress: :8889    # The app's WHEP endpoint lives at :8889/<path>/whep
webrtcLocalUDPAddress: :8189   # WebRTC media (RTP) - must be reachable by viewers
```

`CAM_STREAM_URL` (or its auto-derived equivalent - see
docs/ENVIRONMENT_VARIABLES.md) must point at `.../<path>/whep` on
whichever host exposes port 8889, and `<path>` must be the exact path name
your encoder publishes to. **Check this project's own `.env`: it uses path
`live`, not `cam`** - so OBS/ffmpeg must publish to `.../live`, matching
`CAM_STREAM_URL=http://100.82.102.91:8889/live/whep`. A path-name mismatch
between the publisher and the WHEP URL is the single most common reason
"MediaMTX is reachable but no video appears" - `/cam/debug`'s path status
card (backed by the API check above) tells you definitively whether the
path exists and is `ready`.

## Firewall

Windows Firewall may block inbound connections to MediaMTX's ports from
the Tailscale/LAN network profile, independent of Tailscale's own routing
being fine. If `/cam/debug` shows ICE stuck on `checking` with candidate
pairs that never succeed, run **as Administrator**:

```powershell
New-NetFirewallRule -DisplayName "MediaMTX WebRTC (Tailscale)" -Direction Inbound -Protocol UDP -LocalPort 8189 -Action Allow
New-NetFirewallRule -DisplayName "MediaMTX WHEP (Tailscale)" -Direction Inbound -Protocol TCP -LocalPort 8889 -Action Allow
New-NetFirewallRule -DisplayName "MediaMTX RTMP (publishing)" -Direction Inbound -Protocol TCP -LocalPort 1935 -Action Allow
```

This session could not create these rules automatically - `Get-NetFirewallRule`/
`New-NetFirewallRule` require an elevated (Administrator) PowerShell
session, which this environment doesn't have.

## Locking down the stream at the MediaMTX layer (optional, additional hardening)

The app's own Basic Auth (`middleware.ts`) plus the server-side WHEP proxy
(which never exposes the real MediaMTX URL to the browser) already keep
casual visitors out. But the MediaMTX WebRTC port itself is still directly
reachable on your tailnet/LAN (WebRTC media can't be proxied through
Next.js - see docs/CLOUDFLARE_TUNNEL.md) - anyone else on your tailnet who
guesses the path name could connect directly. For defense in depth,
require credentials at MediaMTX too:

```yaml
authInternalUsers:
  - user: your-cam-username     # match CAM_USERNAME
    pass: your-cam-password     # match CAM_PASSWORD
    ips: []
    permissions:
      - action: read
      - action: playback
  - user: any
    pass:
    ips: ["127.0.0.1", "::1", "100.64.0.0/10"]  # loopback + your whole tailnet
    permissions:
      - action: publish
      - action: api
      - action: metrics
      - action: pprof
```

The Next.js WHEP proxy already sends this Basic Auth header automatically
(`lib/env.ts`'s `getBasicAuthHeader()`), so no code changes are needed -
just edit the YAML with real values and restart MediaMTX (or wait a
moment - MediaMTX hot-reloads `mediamtx.yml` on change without dropping
existing connections).

> MediaMTX config values are **not** interpolated with `${VAR}` syntax
> inside the YAML file itself. For Docker, use MediaMTX's documented
> `MTX_`-prefixed environment variable overrides instead (e.g.
> `MTX_WEBRTCADDITIONALHOSTS`), which is how `docker-compose.yml` sets
> `webrtcAdditionalHosts` without editing the file.

## Running MediaMTX

**Local Windows install:**

```powershell
.\mediamtx.exe mediamtx.yml
```

**Docker (production config):**

```bash
docker compose up -d mediamtx
```

## Verifying it's working

Use `/cam/debug` in this app (see docs/TAILSCALE.md), or query the API
directly once `api: true` is set:

```powershell
# From the MediaMTX machine itself (loopback-only by default):
curl http://127.0.0.1:9997/v3/paths/get/live
```

A `ready: true` response with non-empty `tracks` confirms something is
actively publishing. A `404` means the path doesn't exist yet - start
your encoder.

## Reference

Full list of every config key and its default:
https://github.com/bluenviron/mediamtx/blob/main/mediamtx.yml (not fetched
automatically by this project - check it against your installed MediaMTX
version, since keys occasionally change between releases; this project
was verified against MediaMTX v1.19.3).
