# Tailscale Setup

Tailscale is the simplest way to reach this app and your camera privately
from anywhere, without port-forwarding or a public tunnel. Both this app
and MediaMTX can run on your home machine and be reached over your
tailnet's private `100.x.x.x` address space from any device signed into
the same Tailscale account.

## How this project supports it

- **No hardcoded localhost.** `lib/mediamtx-url.ts` resolves the MediaMTX
  WHEP URL per-request from the `Host` header the browser actually used.
  If you reach the app at `http://100.x.x.x:3000/cam`, the app talks to
  MediaMTX at `http://100.x.x.x:8889/...` automatically - no env var
  needed, unless you want to pin it explicitly (see below).
- **`webrtcAdditionalHosts`** in `mediamtx.yml` explicitly lists this
  machine's Tailscale IP, so MediaMTX always offers it as an ICE
  candidate for WebRTC media - not just whatever `webrtcIPsFromInterfaces`
  happens to enumerate (which, on a typical dev machine, also picks up
  VirtualBox/Hyper-V/VPN adapters that add noise but aren't useful).
- **`/cam/debug`** shows exactly which network it thinks it's on (local /
  Tailscale / LAN / reverse proxy / public), whether MediaMTX and WHEP are
  reachable, and - critically - the actual ICE candidate pairs a real
  connection attempt negotiates, so you can see directly whether the
  Tailscale address was used.

## 1. Install Tailscale on both ends

- On the machine running MediaMTX + this app (already done, per your
  setup).
- On your phone/laptop: install the Tailscale app and sign in to the same
  tailnet.

## 2. Find this machine's Tailscale IP

```powershell
tailscale ip -4
```

Or check `Get-NetIPAddress -AddressFamily IPv4` and look for the
interface named "Tailscale". This project's `mediamtx.yml` already has
this machine's detected address baked into `webrtcAdditionalHosts` - if
Tailscale ever reassigns it (rare), update that line and restart
MediaMTX.

## 3. Reach the app

```
http://100.x.x.x:3000/cam
```

with `100.x.x.x` being this machine's Tailscale IP. `next start`/`next
dev` both bind `0.0.0.0` by default, so this works without extra config
(see next.config.ts / Dockerfile for the Docker case, which sets
`HOSTNAME=0.0.0.0` explicitly for the same reason).

## 4. Set CAM_STREAM_URL only if you need to pin it

Leaving `CAM_STREAM_URL` unset (recommended) means the app always derives
the right MediaMTX address for however you reached it - Tailscale IP one
day, MagicDNS name another, LAN IP a third. Only set it explicitly if:

- You want to force a specific path name, e.g.
  `http://100.x.x.x:8889/live/whep` (matches whatever path your
  encoder/OBS publishes to - **this must match on both ends**, see
  docs/OBS_SETUP.md).
- MediaMTX is on a *different* machine than this app (auto-derivation
  assumes they're co-located).

## 5. Traveling / remote access checklist

When you're away from home and open the app via Tailscale:

1. Tailscale must be **connected and active** on the device you're using
   (check the app - "Connected" status). If it just shows the internet
   without Tailscale connected, `100.x.x.x` addresses aren't routable and
   the page won't even load.
2. The home machine must be **awake and online** with both this app and
   MediaMTX running (Tailscale doesn't wake sleeping machines by default;
   consider disabling sleep on the MediaMTX host, or enabling Windows'
   "Allow this device to wake the computer" for the network adapter along
   with `tailscale set --advertise-...` wake-on-LAN options if needed).
3. OBS/your encoder must still be **publishing** - Tailscale reachability
   and an active camera stream are independent; `/cam/debug` distinguishes
   them (MediaMTX reachable vs. path has no publisher).
4. Unlike a direct LAN connection, Tailscale routes packets over
   WireGuard - there's a small amount of added latency but no NAT/firewall
   traversal problem to solve, since Tailscale handles that at the network
   layer for *any* protocol (including the raw UDP ICE traffic WebRTC
   media uses), not just HTTP. This is what makes Tailscale simpler than
   a plain Cloudflare Tunnel for this use case (see
   docs/CLOUDFLARE_TUNNEL.md for why tunnels need extra care with WebRTC's
   UDP media path).

## 6. If video still doesn't appear

Open `http://100.x.x.x:3000/cam/debug` from the same remote device and
check, top to bottom:

1. **MediaMTX reachability** - if this fails, the request never left the
   phone's Tailscale connection to reach the host at all (check both
   devices' Tailscale status).
2. **Path status** - if MediaMTX is reachable but the path isn't
   `ready`, nothing is currently publishing (start OBS).
3. **ICE connection state** in the live connection panel - if it's stuck
   on `checking`, candidates are being tried but none are connecting
   (check Windows Firewall allows inbound UDP on port 8189 for
   `mediamtx.exe`, since Tailscale's own routing being fine doesn't
   exempt the OS firewall on the receiving app).
4. **Candidate pairs / selected candidate** - confirms which address the
   media path actually settled on.

If step 3 is the blocker, run (as Administrator) on the MediaMTX machine:

```powershell
New-NetFirewallRule -DisplayName "MediaMTX WebRTC (Tailscale)" -Direction Inbound -Protocol UDP -LocalPort 8189 -Action Allow
New-NetFirewallRule -DisplayName "MediaMTX WHEP (Tailscale)" -Direction Inbound -Protocol TCP -LocalPort 8889 -Action Allow
```
