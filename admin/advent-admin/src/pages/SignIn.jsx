import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, ShieldCheck } from 'lucide-react'
import { Button } from '../components/Button'
import { PasswordInput, TextInput } from '../components/Field'
import { InlineError, Notice } from '../components/Notice'
import { useAction } from '../hooks/useAction'
import { useAuthStore } from '../store/useAuthStore'

export function SignIn() {
  const token = useAuthStore((s) => s.token)
  const notice = useAuthStore((s) => s.notice)
  const signIn = useAuthStore((s) => s.signIn)
  const clearNotice = useAuthStore((s) => s.clearNotice)
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const action = useAction()

  if (token) return <Navigate to={location.state?.from || '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    clearNotice()
    let account = null
    const ok = await action.run(async () => {
      account = await signIn(email, password)
    })
    setPassword('')
    if (!ok) return
    navigate(account?.mustChangePassword ? '/account/password' : location.state?.from || '/', { replace: true })
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--aw-primary)] to-[#8b7cff] text-white shadow-lg shadow-[var(--aw-primary)]/30">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">AdventWave Admin</h1>
            <p className="text-xs text-[var(--aw-muted)]">Catalogue, consent and ingest</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] p-5 shadow-[var(--aw-shadow-card)]"
        >
          {notice ? <Notice tone="info">{notice}</Notice> : null}

          <TextInput
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={setEmail}
            required
            autoFocus
          />
          <PasswordInput label="Password" value={password} onChange={setPassword} required />

          <Button type="submit" variant="primary" className="w-full" icon={LogIn} pending={action.pending}>
            Sign in
          </Button>

          <InlineError error={action.error} bare />
        </form>

        <p className="mt-4 text-center text-xs text-[var(--aw-muted)]">
          Admin accounts are created by a super admin. Forgot your password? Ask one to reset it.
        </p>
      </div>
    </div>
  )
}
