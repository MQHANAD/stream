import type { Metadata } from "next";
import { headers } from "next/headers";
import { runMediaMtxDiagnostics } from "@/lib/diagnostics";
import { getConfiguredCamStreamUrl } from "@/lib/env";
import { DebugPanel } from "@/components/debug/debug-panel";

export const metadata: Metadata = { title: "Debug" };
export const dynamic = "force-dynamic";

export default async function CamDebugPage() {
  const headersList = await headers();
  const diagnostics = await runMediaMtxDiagnostics(headersList);
  const configuredStreamUrl = getConfiguredCamStreamUrl();

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-1">
        <a href="/cam" className="text-xs text-neutral-600 hover:text-neutral-400">
          &larr; Back to camera
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Connection Diagnostics</h1>
        <p className="text-sm text-neutral-500">Live WHEP / ICE / WebRTC debugging for /cam</p>
      </header>

      <DebugPanel initialDiagnostics={diagnostics} configuredStreamUrl={configuredStreamUrl} />
    </main>
  );
}
