export function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-4 py-8">
      <div className="h-8 w-48 rounded-lg bg-[var(--aw-surface-elevated)]" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-52 w-40 shrink-0 rounded-2xl bg-[var(--aw-surface-elevated)]"
          />
        ))}
      </div>
    </div>
  )
}
