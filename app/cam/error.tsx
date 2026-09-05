"use client";

import { useEffect } from "react";

export default function CamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cam] error", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-lg font-semibold text-white">Unable to load camera</h1>
      <p className="max-w-sm text-sm text-neutral-400">
        Something went wrong while loading the stream viewer. This does not affect
        your camera.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white hover:bg-white/20"
      >
        Try again
      </button>
    </main>
  );
}
