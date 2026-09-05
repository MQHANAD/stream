export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      {label && <span className="text-sm text-neutral-400">{label}</span>}
    </div>
  );
}
