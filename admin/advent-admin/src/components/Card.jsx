export function Card({ className = '', children, ...rest }) {
  return (
    <section
      className={`rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] shadow-[var(--aw-shadow-card)] ${className}`}
      {...rest}
    >
      {children}
    </section>
  )
}

export function CardHeader({ title, description, actions }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--aw-border)] px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-[var(--aw-text)]">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-[var(--aw-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

/** A table inside a card: scrolls sideways on narrow screens rather than squashing columns. */
export function TableWrap({ children }) {
  return <div className="overflow-x-auto">{children}</div>
}

/** Label/value pairs for detail pages. */
export function DefinitionList({ items }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--aw-muted)]">{label}</dt>
          <dd className="mt-0.5 break-words text-sm text-[var(--aw-text)]">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
