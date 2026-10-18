export function MemberPanelSkeleton({
  label = 'Se încarcă',
  compact = false,
}: {
  label?: string
  compact?: boolean
}) {
  return (
    <section
      aria-busy="true"
      aria-label={label}
      role="status"
      className={`rounded-lg border border-border bg-card p-5 ${compact ? 'min-h-28' : 'min-h-[330px]'}`}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
        <div className="h-6 w-2/5 rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-12 w-1/3 rounded bg-muted" />
        {!compact && <div className="h-24 rounded bg-muted" />}
      </div>
    </section>
  )
}

export default function MemberLoading() {
  return (
    <div className="min-h-screen bg-background px-4 pb-10 pt-28">
      <div className="container grid gap-4">
        <MemberPanelSkeleton compact />
        <MemberPanelSkeleton />
      </div>
    </div>
  )
}
