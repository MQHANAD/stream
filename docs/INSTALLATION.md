# Installation Guide

## Prerequisites

- Node.js 20+ and npm
- MediaMTX (you already have `mediamtx.exe` set up locally)
- OBS Studio (or any RTMP/RTSP/WHIP encoder) to publish your webcam
- (For remote access) a Cloudflare account + a domain added to it, and/or a
  Vercel account

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
CAM_STREAM_URL=http://localhost:8889/cam/whep
CAM_USERNAME=admin
CAM_PASSWORD=change-me-to-something-long-and-random
```

For local testing, `CAM_STREAM_URL` can point at `localhost` since MediaMTX
and the Next.js dev server run on the same machine. See
docs/ENVIRONMENT_VARIABLES.md for the full reference.

## 3. Start MediaMTX

Using your existing local install:

```powershell
.\mediamtx.exe mediamtx.yml
```

Confirm it's listening on `:8889` (WebRTC) and `:1935` (RTMP).

## 4. Publish a test stream

Open OBS and start streaming to `rtmp://localhost:1935` with stream key
`cam` (see docs/OBS_SETUP.md for full settings), or test quickly with
ffmpeg:

```bash
ffmpeg -f lavfi -i testsrc=size=1280x720:rate=30 -c:v libx264 -f flv rtmp://localhost:1935/cam
```

## 5. Run the Next.js app

```bash
npm run dev
```

Visit `http://localhost:3000/cam`. Your browser will prompt for the
`CAM_USERNAME` / `CAM_PASSWORD` you set - once authenticated, the player
should connect to your test stream within a couple of seconds.

## 6. Production build (local sanity check)

```bash
npm run build
npm start
```

## Next steps

- To view the camera from outside your home network: docs/CLOUDFLARE_TUNNEL.md
- To deploy the app itself: docs/VERCEL_DEPLOYMENT.md (or docs Docker section
  in the README for full self-hosting)
- To harden MediaMTX's own auth: docs/MEDIAMTX_CONFIG.md
