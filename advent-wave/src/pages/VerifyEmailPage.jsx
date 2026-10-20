import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../api'
import { useAuthStore } from '../store/useAuthStore'
import { AuthShell } from '../components/AuthShell'
import { describeError } from '../utils/errors'

/** Where the emailed verification link lands (RFC 0005). Works signed in or not. */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState(() => (token ? { status: 'pending' } : { status: 'failed', message: 'This link is incomplete. Open it from the email again.' }))

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    verifyEmail(token).then(
      (user) => {
        if (cancelled) return
        // The account in this tab, if it is the one verified, now shows as verified.
        const current = useAuthStore.getState().user
        if (current?.id === user.id) useAuthStore.getState().setUser(user)
        setState({ status: 'done', email: user.email })
      },
      (err) => {
        if (!cancelled) setState({ status: 'failed', message: describeError(err) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [token])

  const signedIn = Boolean(useAuthStore((s) => s.token))
  const title = { pending: 'Confirming your email…', done: 'Email confirmed', failed: "We couldn't confirm your email" }[state.status]
  const subtitle =
    state.status === 'done'
      ? `${state.email} is confirmed. Thank you.`
      : state.status === 'failed'
        ? state.message
        : null

  return (
    <AuthShell title={title} subtitle={subtitle}>
      {state.status !== 'pending' ? (
        <Link to={signedIn ? '/' : '/login'} className="mt-6 block text-center text-sm font-semibold text-[var(--aw-primary)] hover:underline">
          {signedIn ? 'Go to AdventWave' : 'Log in'}
        </Link>
      ) : null}
    </AuthShell>
  )
}
