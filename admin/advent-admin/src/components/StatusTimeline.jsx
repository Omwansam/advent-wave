import { formatDateTime } from '../lib/format'

/**
 * draft → processing → published | failed (→ withdrawn). The current status is highlighted;
 * the path not taken (published vs failed) is not shown.
 */
export function StatusTimeline({ item }) {
  const { status } = item
  const path = ['draft', 'processing']
  if (status === 'failed') path.push('failed')
  else path.push('published')
  if (status === 'withdrawn') path.push('withdrawn')

  const currentIndex = path.indexOf(status)
  const when = {
    draft: item.createdAt,
    published: item.publishedAt,
  }
  when[status] = when[status] ?? item.updatedAt

  return (
    <ol className="flex flex-wrap items-start gap-y-3 px-4 py-4">
      {path.map((step, index) => {
        const reached = index <= currentIndex
        const current = index === currentIndex
        const tone =
          step === 'failed' ? 'var(--aw-danger)' : step === 'withdrawn' ? 'var(--aw-warn)' : 'var(--aw-primary)'
        return (
          <li key={step} className="flex min-w-0 items-start">
            {index > 0 ? (
              <span
                className="mx-2 mt-2 h-0.5 w-8 shrink-0 rounded sm:w-14"
                style={{ background: reached ? tone : 'var(--aw-border)' }}
                aria-hidden
              />
            ) : null}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-4 shrink-0 rounded-full border-2 ${current && status === 'processing' ? 'aw-pulse' : ''}`}
                  style={{
                    borderColor: reached ? tone : 'var(--aw-border)',
                    background: current ? tone : 'transparent',
                  }}
                  aria-hidden
                />
                <span className={`text-sm capitalize ${current ? 'font-semibold' : reached ? '' : 'text-[var(--aw-muted)]'}`}>
                  {step}
                </span>
              </div>
              {reached && when[step] ? (
                <p className="ml-5.5 text-[11px] text-[var(--aw-muted)]">{formatDateTime(when[step])}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
