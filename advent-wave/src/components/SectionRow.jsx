import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SectionRow({
  title,
  subtitle,
  to,
  children,
  className = '',
}) {
  const header = (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--aw-text)] md:text-2xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--aw-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {to ? (
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--aw-primary)] transition hover:text-[var(--aw-primary-hover)]"
        >
          See all
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  )

  return (
    <section className={`py-8 ${className}`}>
      {header}
      <div className="-mx-1 flex gap-4 overflow-x-auto scroll-smooth pb-2 pt-1 [scrollbar-width:thin] snap-x snap-mandatory overscroll-x-contain">
        {children}
      </div>
    </section>
  )
}
