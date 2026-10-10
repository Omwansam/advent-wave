import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react'

const TONES = {
  info: { Icon: Info, className: 'border-[var(--aw-info)]/30 bg-[var(--aw-info-soft)] text-[var(--aw-info)]' },
  warn: { Icon: AlertTriangle, className: 'border-[var(--aw-warn)]/30 bg-[var(--aw-warn-soft)] text-[var(--aw-warn)]' },
  danger: { Icon: OctagonAlert, className: 'border-[var(--aw-danger)]/30 bg-[var(--aw-danger-soft)] text-[var(--aw-danger)]' },
  ok: { Icon: CheckCircle2, className: 'border-[var(--aw-ok)]/30 bg-[var(--aw-ok-soft)] text-[var(--aw-ok)]' },
}

export function Notice({ tone = 'info', title, children, className = '' }) {
  const { Icon, className: toneClass } = TONES[tone]
  return (
    <div className={`flex gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed ${toneClass} ${className}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 text-[var(--aw-text)]">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  )
}

const STATUS_LABEL = {
  0: 'Network',
  400: 'Rejected',
  401: 'Signed out',
  403: 'Not allowed',
  404: 'Not found',
  405: 'Not available',
  409: 'Refused',
  429: 'Too many attempts',
}

/**
 * A server refusal, in the server's own words, placed next to the action that caused it.
 * Renders nothing when there is no error, so it can sit permanently under a button. `bare`
 * drops the status label where it would mislead (a 401 on the sign-in form is not a sign-out).
 */
export function InlineError({ error, className = '', bare = false }) {
  if (!error || error.name === 'AbortError' || error.cancelled) return null
  const status = error.status
  const label = bare ? null : (STATUS_LABEL[status] ?? (status ? `Error ${status}` : null))
  return (
    <p
      role="alert"
      className={`flex items-start gap-1.5 text-xs leading-snug text-[var(--aw-danger)] ${className}`}
    >
      <OctagonAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>
        {label ? <span className="font-semibold">{label}{status ? ` (${status})` : ''}: </span> : null}
        {error.message}
      </span>
    </p>
  )
}
