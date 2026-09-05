import { LoadingSpinner } from "@/components/loading-spinner";

export default function CamLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <LoadingSpinner label="Loading…" />
    </main>
  );
}
