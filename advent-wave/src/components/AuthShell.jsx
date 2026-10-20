import { Sparkles } from 'lucide-react'

/** The frame shared by sign-in, sign-up, password reset and email verification. */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-svh flex-col bg-[var(--aw-bg)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% -30%, rgba(109,93,246,0.25), transparent), radial-gradient(ellipse 80% 60% at 100% 100%, rgba(201,162,39,0.15), transparent)',
        }}
      />

      <header className="relative flex justify-center px-6 pt-10 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--aw-primary)] to-[#8b7cff] text-white shadow-lg">
            <Sparkles className="size-6" aria-hidden />
          </span>
          <span className="text-xl font-bold tracking-tight text-[var(--aw-text)]">AdventWave</span>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16 pt-4">
        <div className="rounded-3xl bg-[var(--aw-surface)] p-8 shadow-[var(--aw-shadow-hover)] ring-1 ring-black/[0.06] dark:ring-white/10">
          <h1 className="text-center text-2xl font-bold text-[var(--aw-text)]">{title}</h1>
          {subtitle ? <p className="mt-2 text-center text-sm text-[var(--aw-muted)]">{subtitle}</p> : null}
          {children}
        </div>
        {footer ? <div className="mt-6 text-center text-sm text-[var(--aw-muted)]">{footer}</div> : null}
      </main>
    </div>
  )
}

const INPUT =
  'h-12 w-full rounded-xl border border-[var(--aw-border)] bg-[var(--aw-bg)] px-4 text-[var(--aw-text)] outline-none transition focus:border-[var(--aw-primary)] focus:ring-2 focus:ring-[var(--aw-primary)]/25'

export function AuthField({ id, label, hint, ...input }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--aw-text)]">
        {label}
      </label>
      <input id={id} className={INPUT} {...input} />
      {hint ? <p className="mt-1 text-xs text-[var(--aw-muted)]">{hint}</p> : null}
    </div>
  )
}

export function AuthSubmit({ pending, children, pendingLabel }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-full bg-[var(--aw-primary)] text-sm font-bold text-white shadow-lg shadow-[var(--aw-primary)]/30 transition hover:bg-[var(--aw-primary-hover)] disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  )
}

export function AuthMessage({ tone = 'error', children }) {
  if (!children) return null
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`text-sm ${tone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-[var(--aw-text)]'}`}
    >
      {children}
    </p>
  )
}
