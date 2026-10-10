const TONES = {
  neutral: 'bg-[var(--aw-tile)] text-[var(--aw-muted)]',
  primary: 'bg-[var(--aw-primary)]/12 text-[var(--aw-primary)]',
  ok: 'bg-[var(--aw-ok-soft)] text-[var(--aw-ok)]',
  warn: 'bg-[var(--aw-warn-soft)] text-[var(--aw-warn)]',
  danger: 'bg-[var(--aw-danger-soft)] text-[var(--aw-danger)]',
  info: 'bg-[var(--aw-info-soft)] text-[var(--aw-info)]',
}

export function Chip({ tone = 'neutral', pulse = false, children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONES[tone]}`}
    >
      {pulse ? <span className="aw-pulse size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  )
}

const MEDIA_STATUS_TONE = {
  draft: 'neutral',
  processing: 'info',
  published: 'ok',
  withdrawn: 'warn',
  failed: 'danger',
}

export function MediaStatusChip({ status }) {
  return (
    <Chip tone={MEDIA_STATUS_TONE[status] ?? 'neutral'} pulse={status === 'processing'}>
      {status}
    </Chip>
  )
}

const CONSENT_TONE = {
  none: 'neutral',
  pending: 'warn',
  granted: 'ok',
  revoked: 'danger',
  expired: 'danger',
}

/** Church consent and licence status share a vocabulary. */
export function ConsentChip({ status }) {
  return <Chip tone={CONSENT_TONE[status] ?? 'neutral'}>{status}</Chip>
}

export function TypeChip({ type }) {
  return <Chip tone="primary">{type}</Chip>
}
