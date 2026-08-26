/**
 * Shared cartoon module layout + entrance (same galaxy bg from LandingPage).
 */
export default function ModuleShell({
  title,
  subtitle,
  badge,
  badgeClass = 'bg-pond-green text-cartoon-ink',
  children,
  active = true,
  onBack,
}) {
  return (
    <section
      className="space-section relative min-h-[100svh] py-20 md:py-28"
      style={{ opacity: active ? undefined : 0 }}
    >
      <div className="space-section-bg" aria-hidden="true" />
      <div className="relative z-10 container mx-auto max-w-5xl px-4">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div data-mod-header>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mb-3 cursor-pointer text-xs font-bold text-cartoon-yellow transition-colors hover:text-cartoon-cream"
              >
                ← Pond
              </button>
            )}
            <h2 className="module-title">
              {title}
            </h2>
            <p className="mt-2 text-sm font-semibold text-cartoon-cream/65">{subtitle}</p>
          </div>
          {badge && (
            <span
              data-mod-badge
              className={`self-start rounded-xl border-[3px] border-cartoon-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0_#111314] ${badgeClass}`}
            >
              {badge}
            </span>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

export function StatCard({ label, value, hint, accent = 'text-cartoon-cream' }) {
  return (
    <div data-mod-block className="toon-panel p-4 md:p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-cartoon-yellow">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold md:text-3xl ${accent}`}>{value}</p>
      {hint && (
        <p className="mt-1 text-xs font-semibold text-cartoon-cream/50">{hint}</p>
      )}
    </div>
  );
}

export function ProgressBar({ value, color = '#70C431' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-4 overflow-hidden rounded-lg border-[3px] border-cartoon-ink bg-[#1A1D1E] shadow-[2px_2px_0_#111314]">
      <div
        className="h-full rounded-sm transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
