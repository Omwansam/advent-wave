export function SectionSkeleton() {
  return (
    <div className="animate-pulse py-4">
      <div className="mb-4 h-7 w-48 rounded-lg bg-[var(--aw-surface-elevated)]" />
      <div className="flex gap-6 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-[148px] shrink-0 md:w-[172px] lg:w-[184px]">
            <div className="aspect-square rounded-md bg-[var(--aw-surface-elevated)]" />
            <div className="mt-3 h-4 w-3/4 rounded bg-[var(--aw-surface-elevated)]" />
            <div className="mt-2 h-3 w-1/2 rounded bg-[var(--aw-surface-elevated)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Placeholder shaped like Home: chips, the quick-pick grid, then card shelves. */
export function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse space-y-10">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 w-16 rounded-full bg-[var(--aw-surface-elevated)]" />
        ))}
      </div>
      <div>
        <div className="mb-4 h-8 w-56 rounded-lg bg-[var(--aw-surface-elevated)]" />
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-md bg-[var(--aw-surface-elevated)] md:h-16" />
          ))}
        </div>
      </div>
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  )
}
