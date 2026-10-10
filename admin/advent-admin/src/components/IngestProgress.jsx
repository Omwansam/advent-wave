import { CheckCircle2, Circle, CircleX, Loader2 } from 'lucide-react'
import { formatBytes } from '../lib/format'
import { Button } from './Button'
import { InlineError, Notice } from './Notice'

/**
 * The ingest steps as a checklist. `state` is
 * `{ step, failed, error, fraction, loaded, total }`, where `step` is the step in flight (or
 * the one that failed), or 'done'. A failure is shown on the step that caused it.
 */
export function IngestProgress({ steps, state, onCancel }) {
  const currentIndex = state.step === 'done' ? steps.length : steps.findIndex((s) => s.id === state.step)
  const cancelled = state.error?.cancelled

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {steps.map((step, index) => {
          const status =
            index < currentIndex ? 'done' : index > currentIndex ? 'pending' : state.failed ? 'failed' : 'running'
          return (
            <li key={step.id} className="rounded-xl border border-[var(--aw-border)] px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                {status === 'done' ? (
                  <CheckCircle2 className="size-4 text-[var(--aw-ok)]" aria-label="Done" />
                ) : status === 'running' ? (
                  <Loader2 className="size-4 animate-spin text-[var(--aw-primary)]" aria-label="In progress" />
                ) : status === 'failed' ? (
                  <CircleX className="size-4 text-[var(--aw-danger)]" aria-label="Failed" />
                ) : (
                  <Circle className="size-4 text-[var(--aw-muted)]" aria-label="Waiting" />
                )}
                <span className={status === 'pending' ? 'text-[var(--aw-muted)]' : 'font-medium'}>{step.label}</span>
                {step.id === 'put' && status === 'running' && onCancel ? (
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={onCancel}>
                    Cancel
                  </Button>
                ) : null}
              </div>

              {step.id === 'put' && (status === 'running' || (status === 'failed' && state.loaded)) ? (
                <div className="mt-2">
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-[var(--aw-tile)]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round((state.fraction ?? 0) * 100)}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--aw-primary)] transition-[width]"
                      style={{ width: `${Math.round((state.fraction ?? 0) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] tabular-nums text-[var(--aw-muted)]">
                    {Math.round((state.fraction ?? 0) * 100)}% · {formatBytes(state.loaded ?? 0)} of{' '}
                    {formatBytes(state.total ?? 0)}
                  </p>
                </div>
              ) : null}

              {status === 'failed' ? <InlineError error={state.error} className="mt-1.5" /> : null}
            </li>
          )
        })}
      </ol>
      {cancelled ? (
        <Notice tone="info">Upload cancelled. Nothing was stored; the draft remains and can be uploaded again.</Notice>
      ) : null}
    </div>
  )
}
