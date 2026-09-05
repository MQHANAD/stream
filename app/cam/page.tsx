import type { Metadata } from "next";
import { CameraViewer } from "@/components/camera-viewer";
import { ConfigError } from "@/components/config-error";

export const metadata: Metadata = {
  title: "Camera",
};

// CAM_STREAM_URL is optional (auto-derived per-request when unset - see
// lib/mediamtx-url.ts). CAM_USERNAME/CAM_PASSWORD are already enforced by
// middleware.ts before any request reaches this page, but checking here
// too means a misconfiguration shows this friendly screen instead of a
// 500 if middleware is ever bypassed in a future refactor.
const REQUIRED_ENV_VARS = ["CAM_USERNAME", "CAM_PASSWORD"] as const;

export default function CamPage() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Private Camera
        </h1>
        <p className="text-sm text-neutral-500">Live feed from your MediaMTX stream</p>
        <a
          href="/cam/debug"
          className="mt-1 text-xs text-neutral-600 underline decoration-dotted underline-offset-4 hover:text-neutral-400"
        >
          Connection diagnostics
        </a>
      </header>

      {missing.length > 0 ? <ConfigError missing={missing} /> : <CameraViewer />}
    </main>
  );
}
