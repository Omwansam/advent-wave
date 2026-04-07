import { Search } from 'lucide-react'

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search worship, sermons, artists…',
  className = '',
}) {
  return (
    <form
      className={`relative flex min-w-0 flex-1 items-center ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
    >
      <Search
        className="pointer-events-none absolute left-3 size-4 text-[var(--aw-muted)]"
        aria-hidden
      />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full min-w-0 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] py-2 pl-10 pr-4 text-sm text-[var(--aw-text)] shadow-sm outline-none transition placeholder:text-[var(--aw-muted)] focus:border-[var(--aw-primary)] focus:ring-2 focus:ring-[var(--aw-primary)]/25"
      />
    </form>
  )
}
