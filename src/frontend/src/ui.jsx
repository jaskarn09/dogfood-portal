// Small presentational building blocks shared across pages.
// None of these call the API or hold app state — purely visual.

export function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

const badgeTones = {
  neutral: 'badge-neutral',
  draft: 'badge-draft',
  submitted: 'badge-submitted',
  info: 'badge-info',
  danger: 'badge-danger',
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={badgeTones[tone] || 'badge-neutral'}>{children}</span>
}

export function Alert({ type = 'success', children }) {
  if (!children) return null
  return <div className={type === 'error' ? 'alert-error' : 'alert-success'}>{children}</div>
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="card card-pad text-center py-12">
      <p className="font-medium text-ink">{title}</p>
      {description && (
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-14">
      <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-brand-500 animate-spin" />
      {label}
    </div>
  )
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="card card-pad">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-ink mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}