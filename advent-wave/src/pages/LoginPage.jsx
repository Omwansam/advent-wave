import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { requestPasswordReset } from '../api'
import { useAuthStore } from '../store/useAuthStore'
import { AuthField, AuthMessage, AuthShell, AuthSubmit } from '../components/AuthShell'
import { describeError } from '../utils/errors'

const TITLES = {
  login: ['Log in to AdventWave', 'Worship, sermons and podcasts, wherever you left them.'],
  register: ['Create your account', 'Free. Your library and listening follow you to every device.'],
  forgot: ['Reset your password', "Enter your email and we'll send you a link to choose a new one."],
}

/**
 * Sign-in, sign-up and the password-reset request, on one page (RFC 0005). An account made by
 * the dev issuer or seeded for demos has no password: "Forgot password" is how its owner sets one.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  if (user && token) {
    return <Navigate to={location.state?.from || '/'} replace />
  }

  const switchTo = (next) => {
    setMode(next)
    setError('')
    setNotice('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!email.trim().includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    setPending(true)
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(email.trim())
        setNotice(`If ${email.trim()} has an AdventWave account, a reset link is on its way. It works for an hour.`)
        setPending(false)
        return
      }
      if (mode === 'register') {
        await register({ email, password, name })
      } else {
        await login(email, password)
      }
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(describeError(err))
      setPending(false)
    }
  }

  const [title, subtitle] = TITLES[mode]

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        mode === 'login' ? (
          <>
            New to AdventWave?{' '}
            <button type="button" onClick={() => switchTo('register')} className="font-semibold text-[var(--aw-primary)] hover:underline">
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" onClick={() => switchTo('login')} className="font-semibold text-[var(--aw-primary)] hover:underline">
              Log in
            </button>
          </>
        )
      }
    >
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {mode === 'register' ? (
          <AuthField id="auth-name" label="Your name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="How friends will see you" />
        ) : null}
        <AuthField id="auth-email" label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        {mode !== 'forgot' ? (
          <AuthField
            id="auth-password"
            label="Password"
            type="password"
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={mode === 'register' ? 'At least 8 characters. A short phrase is easier to remember and harder to guess.' : undefined}
          />
        ) : null}

        <AuthMessage>{error}</AuthMessage>
        <AuthMessage tone="info">{notice}</AuthMessage>

        <AuthSubmit pending={pending} pendingLabel={mode === 'forgot' ? 'Sending…' : 'One moment…'}>
          {mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : 'Send reset link'}
        </AuthSubmit>

        {mode === 'login' ? (
          <button type="button" onClick={() => switchTo('forgot')} className="block w-full text-center text-sm font-medium text-[var(--aw-muted)] hover:text-[var(--aw-text)] hover:underline">
            Forgot your password?
          </button>
        ) : null}
      </form>

      {import.meta.env.DEV ? <DevSignIn /> : null}
    </AuthShell>
  )
}

/**
 * Local development only — compiled out of production builds. The dev issuer signs in any email
 * without a password, including the seeded demo accounts; a server runs with it off.
 */
function DevSignIn() {
  const navigate = useNavigate()
  const devLogin = useAuthStore((s) => s.devLogin)
  const [error, setError] = useState('')
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-[var(--aw-border)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--aw-muted)]">Local development</p>
      <p className="mt-1 text-xs text-[var(--aw-muted)]">Sign in as a seeded demo account through the dev issuer. Not in production builds.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {['listener@adventwave.app', 'pastor@adventwave.app', 'newuser@adventwave.app'].map((email) => (
          <button
            key={email}
            type="button"
            onClick={async () => {
              setError('')
              try {
                await devLogin(email)
                navigate('/', { replace: true })
              } catch (err) {
                setError(describeError(err))
              }
            }}
            className="rounded-full border border-[var(--aw-border)] px-3 py-1.5 text-xs font-medium text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]"
          >
            {email.split('@')[0]}
          </button>
        ))}
      </div>
      <AuthMessage>{error}</AuthMessage>
    </div>
  )
}
