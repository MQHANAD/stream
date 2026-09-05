# Vercel Deployment Guide

The Next.js app (the viewer + Basic Auth + WHEP signaling proxy) deploys to
Vercel's free Hobby tier. MediaMTX stays on your own machine/network,
reachable through Cloudflare Tunnel (see docs/CLOUDFLARE_TUNNEL.md) - Vercel
never runs MediaMTX itself.

## 1. Push the project to a Git repo

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

(`.env.local` is already gitignored - never commit real credentials.)

## 2. Import into Vercel

1. Go to https://vercel.com/new and import the repository.
2. Framework Preset: **Next.js** (auto-detected).
3. Build command / output: leave the defaults - no changes needed.

## 3. Set environment variables

In the Vercel project → **Settings → Environment Variables**, add for
**Production** (and Preview, if you want protected previews too):

| Name             | Value |
|-------------------|-------|
| `CAM_STREAM_URL`  | `https://cam.example.com/cam/whep` (your Cloudflare Tunnel hostname) |
| `CAM_USERNAME`    | your chosen username |
| `CAM_PASSWORD`    | a long, random password |

## 4. Deploy

Click **Deploy**. Vercel builds and serves the app over HTTPS automatically
- no extra TLS setup needed on your side.

## 5. Verify

1. Visit `https://<your-project>.vercel.app/cam`.
2. The browser should prompt for HTTP Basic Auth - enter `CAM_USERNAME` /
   `CAM_PASSWORD`.
3. The player should connect within a few seconds if MediaMTX + the tunnel
   are up, or show **Camera Offline** with automatic retries every 5 seconds
   if not.

## Notes specific to Vercel

- API routes under `app/api/whep` run as Vercel Serverless Functions (Node.js
  runtime, set explicitly via `export const runtime = "nodejs"`) - no
  additional configuration is required.
- These functions only proxy the small SDP text payloads for signaling; they
  are not in the media path, so Vercel's function limits are not a concern
  here.
- A custom domain can be attached in **Settings → Domains** if you don't
  want the default `vercel.app` subdomain; combine this with
  `robots.ts` (already disallowing all crawling) for a private-by-default
  setup.
- Redeploy (or use **Redeploy** in the dashboard) after changing environment
  variables - they're baked in at build/runtime start, not read live.
