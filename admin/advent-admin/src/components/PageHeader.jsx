import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PageHeader({ title, description, actions, back, meta }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <Link
            to={back.to}
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--aw-muted)] hover:text-[var(--aw-text)]"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            {back.label}
          </Link>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
          {meta}
        </div>
        {description ? <p className="mt-1 max-w-3xl text-sm text-[var(--aw-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
