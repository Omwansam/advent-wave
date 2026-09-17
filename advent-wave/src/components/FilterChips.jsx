/** The pill row at the top of a feed. The active chip inverts to text-on-background. */
export function FilterChips({ options, value, onChange, label = 'Filter' }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-[var(--aw-text)] text-[var(--aw-bg)]'
                : 'bg-[var(--aw-tile)] text-[var(--aw-text)] hover:bg-[var(--aw-tile-hover)]'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
