import { Loader2, RotateCw } from 'lucide-react'
import { Button } from './Button'
import { InlineError } from './Notice'

export function Loading({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-8 text-sm text-[var(--aw-muted)] ${className}`}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  )
}

export function LoadError({ error, onRetry, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 px-4 py-6 ${className}`}>
      <InlineError error={error} className="text-sm" />
      {onRetry ? (
        <Button size="sm" icon={RotateCw} onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}

export function Empty({ children, className = '' }) {
  return <p className={`px-4 py-8 text-center text-sm text-[var(--aw-muted)] ${className}`}>{children}</p>
}

/** The three states of an async section: loading, failed with nothing to show, or loaded. */
export function AsyncBody({ state, children, empty, isEmpty }) {
  if (state.loading) return <Loading />
  if (state.error && state.data === undefined) return <LoadError error={state.error} onRetry={state.reload} />
  if (isEmpty?.(state.data)) return <Empty>{empty}</Empty>
  return children(state.data)
}
