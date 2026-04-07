import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { MOCK_LOGIN } from '../data/mockAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState(MOCK_LOGIN.email)
  const [password, setPassword] = useState(MOCK_LOGIN.password)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  const onSubmit = (e) => {
    e.preventDefault()
    setError('')
    const em = email.trim()
    if (!em || !em.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters (demo).')
      return
    }
    setSubmitting(true)
    window.setTimeout(() => {
      login(em, em.split('@')[0])
      setSubmitting(false)
      navigate('/', { replace: true })
    }, 400)
  }

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
          <span className="text-xl font-bold tracking-tight text-[var(--aw-text)]">
            AdventWave
          </span>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16 pt-4">
        <div className="rounded-3xl bg-[var(--aw-surface)] p-8 shadow-[var(--aw-shadow-hover)] ring-1 ring-black/[0.06] dark:ring-white/10">
          <h2 className="text-center text-2xl font-bold text-[var(--aw-text)]">
            Log in to continue
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--aw-muted)]">
            This is a demo — use the mock account below or your own email (4+
            char password).
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--aw-primary)]/25 bg-[var(--aw-primary)]/8 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--aw-primary)]">
              Mock login (try this)
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <dt className="shrink-0 text-[var(--aw-muted)]">Email</dt>
                <dd className="font-mono text-[var(--aw-text)]">
                  {MOCK_LOGIN.email}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <dt className="shrink-0 text-[var(--aw-muted)]">Password</dt>
                <dd className="font-mono text-[var(--aw-text)]">
                  {MOCK_LOGIN.password}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => {
                setEmail(MOCK_LOGIN.email)
                setPassword(MOCK_LOGIN.password)
                setError('')
              }}
              className="mt-4 w-full rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] py-2.5 text-sm font-semibold text-[var(--aw-text)] transition hover:bg-[var(--aw-surface-elevated)]"
            >
              Reset fields to mock values
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-sm font-medium text-[var(--aw-text)]"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full rounded-xl border border-[var(--aw-border)] bg-[var(--aw-bg)] px-4 text-[var(--aw-text)] outline-none transition focus:border-[var(--aw-primary)] focus:ring-2 focus:ring-[var(--aw-primary)]/25"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-[var(--aw-text)]"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-xl border border-[var(--aw-border)] bg-[var(--aw-bg)] px-4 text-[var(--aw-text)] outline-none transition focus:border-[var(--aw-primary)] focus:ring-2 focus:ring-[var(--aw-primary)]/25"
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-full bg-[var(--aw-primary)] text-sm font-bold text-white shadow-lg shadow-[var(--aw-primary)]/30 transition hover:bg-[var(--aw-primary-hover)] disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Log in'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--aw-border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--aw-surface)] px-3 text-[var(--aw-muted)]">
                or
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-[var(--aw-border)] text-sm font-semibold text-[var(--aw-muted)] opacity-70"
          >
            Continue with Google
            <span className="text-xs font-normal">(soon)</span>
          </button>

          <p className="mt-8 text-center text-sm text-[var(--aw-muted)]">
            Don&apos;t have an account?{' '}
            <span className="font-medium text-[var(--aw-primary)]">
              Sign up
            </span>{' '}
            <span className="text-xs">(coming soon)</span>
          </p>
        </div>
      </main>

      <footer className="relative px-6 pb-8 text-center text-xs text-[var(--aw-muted)]">
        By continuing, you agree to our Terms and Privacy Policy (demo).
      </footer>
    </div>
  )
}
