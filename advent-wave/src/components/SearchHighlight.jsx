function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Highlights the first case-insensitive occurrence segments of `query` in `text`.
 */
export function SearchHighlight({ text, query, className = '' }) {
  const raw = text == null ? '' : String(text)
  const q = query?.trim() ?? ''
  if (!q || !raw) {
    return <span className={className}>{raw}</span>
  }

  const re = new RegExp(`(${escapeRegExp(q)})`, 'gi')
  const parts = raw.split(re)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.toLowerCase() === q.toLowerCase()) {
          return (
            <mark
              key={i}
              className="rounded-sm bg-[var(--aw-primary)]/25 px-0.5 font-inherit text-[var(--aw-text)] dark:bg-[var(--aw-primary)]/40"
            >
              {part}
            </mark>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
