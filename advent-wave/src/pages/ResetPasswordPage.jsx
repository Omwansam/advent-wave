import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { confirmPasswordReset } from '../api'
import { useAuthStore } from '../store/useAuthStore'
import { AuthField, AuthMessage, AuthShell, AuthSubmit } from '../components/AuthShell'
import { describeError } from '../utils/errors'

/**
 * Where the emailed reset link lands (RFC 0005). Choosing a password here signs in, ends every
 * other session, and counts as verifying the email.
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const applySession = useAuthStore((s) => s.applySession)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (!token) {
    return (
      <AuthShell title="This link is incomplete" subtitle="Open the link from the email again, or ask for a new one.">
        <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-[var(--aw-primary)] hover:underline">
          Back to log in
        </Link>
      </AuthShell>
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('The two passwords are different.')
      return
    }
    setPending(true)
    try {
      applySession(await confirmPasswordReset(token, password))
      navigate('/', { replace: true })
    } catch (err) {
      setError(describeError(err))
      setPending(false)
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="You'll be signed in, and signed out everywhere else.">
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <AuthField id="reset-password" label="New password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." />
        <AuthField id="reset-confirm" label="The same again" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <AuthMessage>{error}</AuthMessage>
        <AuthSubmit pending={pending} pendingLabel="Saving…">Save and sign in</AuthSubmit>
      </form>
    </AuthShell>
  )
}
