# OBS Configuration

This app is a **viewer** - it plays back a stream that something else
publishes into MediaMTX. OBS Studio is the easiest way to publish your
webcam.

## 1. Add your webcam as a source

1. Open OBS → **Sources** → **+** → **Video Capture Device**.
2. Select your webcam, set resolution/FPS (1080p30 or 720p30 is plenty for a
   home cam and keeps bandwidth/CPU low).

## 2. Configure the stream output

OBS → **Settings** → **Stream**:

| Setting        | Value |
|-----------------|-------|
| Service          | `Custom...` |
| Server            | `rtmp://<mediamtx-host>:1935` |
| Stream Key        | `cam` |

- `<mediamtx-host>` is the LAN IP or hostname of the machine running
  MediaMTX (e.g. `192.168.1.50`), **not** the public Cloudflare Tunnel
  hostname - OBS should publish over your local network, not the internet.
- The stream key (`cam`) becomes the MediaMTX path name, and **must
  exactly match** the path in your `CAM_STREAM_URL` (`.../cam/whep`) or
  `CAM_STREAM_PATH` if using auto-derivation (see
  docs/ENVIRONMENT_VARIABLES.md). A mismatch here (e.g. OBS publishing to
  `cam` while the app requests `.../live/whep`) is the most common reason
  "MediaMTX is reachable but no video appears" - `/cam/debug` will show
  the path as reachable but not `ready`/found in that case.

## 3. Output settings (Settings → Output → Streaming)

| Setting        | Recommended |
|-----------------|--------------|
| Encoder           | **x264 (software)** - see warning below before using NVENC/AMF/QSV |
| Rate Control      | CBR |
| Bitrate            | 2500–4000 Kbps for 1080p30 |
| Keyframe Interval | 2s |
| Preset             | veryfast / balanced |
| Profile            | high |

Lower the bitrate if you're viewing remotely over a modest upload connection
at the camera's location - remember the tunnel/router upload bandwidth is
the bottleneck, not the viewer's connection.

### Critical: disable B-frames, or WebRTC playback will fail

WebRTC's H264 profile does not support B-frames. MediaMTX enforces this and
will **accept the RTMP publish but reject every WebRTC viewer** with
`WebRTC doesn't support H264 streams with B-frames` in its logs - the
stream looks "up" in `/cam/debug`'s path status, but no session ever stays
connected. This is easy to hit by accident: OBS's **Simple output mode with
a hardware encoder (NVENC/AMF/QSV) hardcodes 2 B-frames with no way to
change it from the UI** - there is no "B-frames" field exposed for hardware
encoders in Simple mode.

The reliable fix (verified 2026-08-05 against OBS 31, NVENC preset p5):

1. Settings → Output → Output Mode: keep **Simple**.
2. Encoder: **x264** (software - CPU cost is minor at 720p/1080p and this
   is a single local stream, not a public broadcast).
3. Check **"Enable advanced encoder settings"** (appears once x264 is
   selected).
4. In the custom options field, enter exactly:
   ```
   bframes=0
   ```
   Not `bf=0` - that's an FFmpeg/libavcodec alias and x264's own option
   parser rejects it silently (logged as `x264 param: bf=0 failed`, easy to
   miss). x264's native parameter name is `bframes`.

If you'd rather keep a hardware encoder for CPU headroom (e.g. while
gaming), the alternative is Advanced output mode with that encoder's own
B-frames property set to 0, where exposed - or run a dedicated headless
ffmpeg process for this stream instead of OBS (see "Alternatives to OBS"
below), decoupled from whatever your main OBS profile is used for.

### If OBS has third-party plugins that manage streaming (OWN3D, Streamlabs, restream tools, etc.)

Some OBS plugins hook stream-start to inject their own relay/session
tracking, which can **silently rewrite your custom RTMP stream key** the
moment you click "Start Streaming" - even though `Settings → Stream` shows
the key you typed. Confirmed with the OWN3D plugin (`own3d.dll`): the
configured key stuck right up until stream start, then flipped to a
plugin-generated value like `live_443761482_swn3AFNjlh2acj8AmNKYWrFN8OEbNZ`,
identically across restarts - MediaMTX then registers the path under that
generated name instead of your intended one. The stream itself still works
fine; only the path *name* is different than expected.

To check: after starting the stream, look at MediaMTX's own log (or
`http://<mediamtx-host>:9997/v3/paths/list` with the control API enabled -
see docs/MEDIAMTX_CONFIG.md) for the actual path name in use, and update
`CAM_STREAM_URL` to match if it's not what you configured in OBS.

To eliminate it entirely: disable the offending plugin. The clean way is
removing/renaming its DLL from `obs-plugins\64bit\` (requires an elevated
PowerShell if OBS is installed under `Program Files`):
```powershell
Rename-Item 'C:\Program Files\obs-studio\obs-plugins\64bit\own3d.dll' 'own3d.dll.disabled'
```
OBS's `--safe-mode` launch flag also disables it, but **also disables
obs-websocket** (also not on the safe list), so it only works if you're
configuring OBS by hand rather than automating it.

## 4. Go Live

Click **Start Streaming** in OBS. MediaMTX will automatically create the
`cam` path the moment OBS connects - no extra configuration needed (unless
you defined the path explicitly in `mediamtx.yml`, as this project's
`mediamtx/mediamtx.yml` does).

Verify it's working before wiring up the Next.js app:

```bash
ffplay rtmp://<mediamtx-host>:1935/cam
```

or open `http://<mediamtx-host>:8889/cam` in a browser on the same network
(MediaMTX serves a built-in test player there).

## Alternatives to OBS

Any encoder that can publish RTMP, RTSP, or WHIP works:

- **ffmpeg**: `ffmpeg -f dshow -i video="Your Webcam" -c:v libx264 -f flv rtmp://<mediamtx-host>:1935/cam`
- A dedicated IP camera that publishes RTSP directly - point MediaMTX's
  `paths.cam.source` at the camera's RTSP URL instead of `publisher`.
