# Cloudflare Tunnel Setup

Cloudflare Tunnel exposes MediaMTX to the internet without opening inbound
ports on your router, using `cloudflared` running next to MediaMTX. It's
free and requires no paid Cloudflare plan.

## Important: read this before you start

A standard public Cloudflare Tunnel hostname proxies **HTTP(S) and TCP**.
WebRTC's signaling (the WHEP HTTP request/response) is HTTP and tunnels
perfectly. But WebRTC **media** (the actual audio/video RTP packets)
normally flows over **UDP** via ICE, and a plain public Cloudflare Tunnel
does not proxy arbitrary UDP traffic to anonymous browsers. This is a
protocol limitation, not something this app's code can work around.

You have two practical options:

### Option A (recommended for home use): tunnel signaling, port-forward media

- Put the Next.js app's HTTPS traffic through Cloudflare Tunnel (or deploy
  it to Vercel, which is HTTPS by default anyway - see
  docs/VERCEL_DEPLOYMENT.md).
- Port-forward MediaMTX's WebRTC **UDP** port (`8189` by default) directly
  on your router to the MediaMTX machine. This is a single UDP port, not a
  range, and only carries encrypted media - it's a reasonable exposure for
  a home camera.
- Set `webrtcAdditionalHosts` to your public IP or a DDNS hostname (e.g. a
  free DuckDNS/No-IP name) so ICE candidates resolve correctly.
- Optionally also tunnel MediaMTX's HTTP WebRTC port (`8889`) through
  Cloudflare instead of forwarding it, since only signaling needs to reach
  it - the UDP port is what actually needs a direct path.

### Option B (no router access / behind CGNAT)

If you can't port-forward, WebRTC media has no path to a browser's UDP
socket regardless of Cloudflare Tunnel. The standard fix is a self-hosted
TURN relay (e.g. `coturn`) reachable over TCP 443, which **can** be exposed
through a tunnel, with `webrtcICEServers2` pointed at it in
`mediamtx.yml`/`mediamtx/mediamtx.yml`. Setting up TURN is outside the scope
of this project's generated files, but it's the correct next step if Option
A isn't available to you.

Most home setups with router access should use Option A - it's simpler and
this is what the steps below assume.

## 1. Install cloudflared

- Windows: download from
  https://github.com/cloudflare/cloudflared/releases and add it to `PATH`.
- Or `winget install --id Cloudflare.cloudflared`.

## 2. Authenticate and create a named tunnel

```powershell
cloudflared tunnel login
cloudflared tunnel create private-cam
```

This creates a tunnel and a credentials file
(`%USERPROFILE%\.cloudflared\<tunnel-id>.json`).

## 3. Route a hostname to the tunnel

```powershell
cloudflared tunnel route dns private-cam cam.example.com
```

Replace `cam.example.com` with a subdomain of a domain you manage in
Cloudflare.

## 4. Configure ingress

Create `%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: private-cam
credentials-file: C:\Users\<you>\.cloudflared\<tunnel-id>.json

ingress:
  # MediaMTX's WebRTC HTTP signaling (WHEP)
  - hostname: cam.example.com
    service: http://localhost:8889
  - service: http_status:404
```

If you're also self-hosting the Next.js app instead of using Vercel, add a
second hostname/service pair pointing at `http://localhost:3000` and set
`CAM_STREAM_URL` to the MediaMTX one, not the app's own hostname.

## 5. Run the tunnel

```powershell
cloudflared tunnel run private-cam
```

To run it as a Windows service so it survives reboots:

```powershell
cloudflared service install
```

## 6. Point the app at it

```
CAM_STREAM_URL=https://cam.example.com/cam/whep
```

## 7. Verify

- `https://cam.example.com/cam/whep` should respond (a `POST` with an SDP
  offer, e.g. via the `/cam` page in this app) - a bare `GET` in a browser
  typically returns `405 Method Not Allowed`, which just confirms MediaMTX
  is reachable through the tunnel.
- If the video never connects even though signaling succeeds, that's the
  UDP media path described above - double-check your port forward and
  `webrtcAdditionalHosts`.
