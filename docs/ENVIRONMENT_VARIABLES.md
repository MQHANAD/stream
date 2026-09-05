# Environment Variables

Copy `.env.example` to `.env.local` for local development (or `.env` -
Next.js loads both; this project's own dev setup uses `.env`). In
production (Vercel or Docker), set these as real environment variables -
never commit `.env.local`/`.env`.

| Variable | Required | Where it's used | Description |
|---|:---:|---|---|
| `CAM_STREAM_URL` | No | `lib/mediamtx-url.ts` (server only) | Explicit WHEP endpoint override, e.g. `https://cam.example.com/cam/whep`. **Leave unset** unless MediaMTX runs on a different host than this app - see "Auto-derivation" below. Never sent to the browser. |
| `CAM_MEDIAMTX_PROTOCOL` | No | `lib/mediamtx-url.ts` | Scheme used when auto-deriving the URL. Default `http`. |
| `CAM_MEDIAMTX_PORT` | No | `lib/mediamtx-url.ts` | Port used when auto-deriving the URL. Default `8889` (MediaMTX's `webrtcAddress`). |
| `CAM_STREAM_PATH` | No | `lib/mediamtx-url.ts` | Path used when auto-deriving the URL. Default `/cam/whep`. Must match the path name your encoder publishes to (see docs/OBS_SETUP.md) - **this project's own `.env` uses `/live/whep`**, so set this to `/live/whep` too if you keep that path name, or change OBS to publish to `cam` instead. |
| `CAM_MEDIAMTX_API_PORT` | No | `lib/diagnostics.ts` | MediaMTX control API port, used only by `/cam/debug` for path-level status. Default `9997`. |
| `CAM_USERNAME` | **Yes** | `middleware.ts`, `lib/env.ts` | Username for HTTP Basic Auth on the whole app. Also sent as a Basic Auth header to MediaMTX if you enable matching credentials in `authInternalUsers`. |
| `CAM_PASSWORD` | **Yes** | `middleware.ts`, `lib/env.ts` | Password for HTTP Basic Auth, paired with `CAM_USERNAME`. |

## Auto-derivation (why `CAM_STREAM_URL` is now optional)

`lib/mediamtx-url.ts`'s `resolveStreamUrl()` runs on every WHEP request and
decides the MediaMTX URL like this:

1. If `CAM_STREAM_URL` is set **and** its hostname is not
   `localhost`/`127.0.0.1`/`0.0.0.0`, use it exactly as configured. This is
   the explicit-override path, for when MediaMTX is on a different host
   than this app (e.g. this app on Vercel, MediaMTX behind Cloudflare
   Tunnel at a different hostname).
2. Otherwise, build the URL from the **incoming request's own `Host`
   header** (`x-forwarded-host` if a real reverse proxy set it) plus
   `CAM_MEDIAMTX_PORT`/`CAM_STREAM_PATH`. If you opened the app at
   `http://100.x.x.x:3000/cam`, MediaMTX is assumed reachable at
   `http://100.x.x.x:8889<CAM_STREAM_PATH>` - true whenever MediaMTX and
   this app run on the same machine, regardless of whether that machine
   was reached via `localhost`, a LAN IP, or a Tailscale IP.

If `CAM_STREAM_URL` is explicitly set to `localhost`/`127.0.0.1`, the app
detects this, logs a warning, and falls back to auto-derivation instead -
a literal loopback address is essentially never correct for a remote
client. See `/cam/debug`'s "MediaMTX reachability" card, which always
shows the resolved URL and whether it was explicit or derived.

## Notes

- `CAM_USERNAME`/`CAM_PASSWORD` are enforced by `middleware.ts` and fail
  closed (HTTP 500 for every request) if unset - never allowing
  unauthenticated access by omission.
- All variables are **server-only**. None are prefixed with `NEXT_PUBLIC_`,
  and none are ever passed as props into a Client Component - the browser
  only ever talks to this app's own `/api/whep`.
- Changing these values requires a redeploy (Vercel) or process/container
  restart - Next.js reads `process.env` at request time for server code,
  but a running dev/prod server won't pick up `.env` edits without a
  restart.
- Use a long, random password. Basic Auth sends credentials Base64-encoded
  (not encrypted) on every request, so **serve the app over HTTPS** in any
  deployment reachable outside a private network like Tailscale (Vercel
  does this automatically; see docs/CLOUDFLARE_TUNNEL.md for the MediaMTX
  side). Plain HTTP over Tailscale is reasonable since Tailscale's
  WireGuard tunnel already encrypts the traffic end-to-end.
