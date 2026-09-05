"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center text-white">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-neutral-400">
        An unexpected error occurred while loading the page.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium hover:bg-white/20"
      >
        Try again
      </button>
    </div>
  );
}
