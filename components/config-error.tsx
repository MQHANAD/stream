export function ConfigError({ missing }: { missing: string[] }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
      <h2 className="text-lg font-semibold text-red-300">Configuration Required</h2>
      <p className="text-sm text-neutral-400">
        The following environment variable{missing.length > 1 ? "s are" : " is"} missing:
      </p>
      <ul className="mx-auto flex flex-col gap-1 font-mono text-sm text-red-300">
        {missing.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className="text-xs text-neutral-500">
        Set these in your <code className="text-neutral-400">.env.local</code> file
        (or your hosting provider&apos;s environment settings) and restart the app.
        See docs/ENVIRONMENT_VARIABLES.md.
      </p>
    </div>
  );
}
