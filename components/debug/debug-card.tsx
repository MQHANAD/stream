export function DebugCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DebugRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-1.5 text-xs last:border-b-0">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className="text-right font-mono text-neutral-200 break-all">{value}</span>
    </div>
  );
}

export function StatusDot({ ok }: { ok: boolean | undefined }) {
  const color = ok === undefined ? "bg-neutral-500" : ok ? "bg-emerald-400" : "bg-red-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}
