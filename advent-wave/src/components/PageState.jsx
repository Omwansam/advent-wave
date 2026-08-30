import { Link } from 'react-router-dom'
import { SectionSkeleton } from './PageSkeleton'

/** Placeholder while a page's first request is in flight. */
export function PageLoading({ sections = 3 }) {
  return (
    <div aria-busy="true" aria-live="polite">
      {Array.from({ length: sections }).map((_, i) => (
        <SectionSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Shown when a request fails. The message comes from the gateway's error body when there is
 * one, so a 404 reads differently from the server being down — a blank page and "something
 * went wrong" are the same to a user, and neither tells them whether to retry.
 */
export function PageError({ error, onRetry, what = 'this page' }) {
  const offline = !error?.status
  return (
    <div className="rounded-2xl bg-[var(--aw-surface)] p-12 text-center shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
      <p className="font-semibold text-[var(--aw-text)]">
        {offline ? 'Cannot reach the AdventWave server' : `Could not load ${what}`}
      </p>
      <p className="mt-2 text-sm text-[var(--aw-muted)]">
        {offline
          ? 'The gateway is not answering. Start it with ./mvnw spring-boot:run -pl gateway.'
          : error?.message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-full bg-[var(--aw-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--aw-primary-hover)]"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}

/** Shown when a lookup succeeded but the thing does not exist. */
export function PageNotFound({ what = 'Not found', to = '/search', label = 'Search' }) {
  return (
    <div className="rounded-2xl bg-[var(--aw-surface)] p-12 text-center shadow-[var(--aw-shadow-card)]">
      <p className="text-[var(--aw-muted)]">{what}</p>
      <Link to={to} className="mt-4 inline-block font-medium text-[var(--aw-primary)]">
        {label}
      </Link>
    </div>
  )
}
