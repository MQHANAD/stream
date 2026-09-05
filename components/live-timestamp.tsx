"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/format";

/** Ticks every second so "Last attempt: Xs ago" stays live. */
export function LiveTimestamp({ date }: { date: Date }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return <>{formatRelativeTime(date)}</>;
}
