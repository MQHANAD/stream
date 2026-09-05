"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] fatal error", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-dvh items-center justify-center bg-neutral-950 px-4 text-white">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-neutral-400">The application failed to load.</p>
          <button
            onClick={reset}
            className="mt-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
