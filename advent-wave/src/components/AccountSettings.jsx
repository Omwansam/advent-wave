import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, KeyRound, LogOut, MailWarning, MonitorSmartphone } from 'lucide-react'
import { changePassword, resendVerification, signOutEverywhere } from '../api'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import { describeError } from '../utils/errors'

const ROW =
  'flex w-full items-center gap-3 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4 text-left transition hover:bg-[var(--aw-surface-elevated)]'
const INPUT =
  'h-11 w-full rounded-xl border border-[var(--aw-border)] bg-[var(--aw-bg)] px-3 text-sm text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)] focus:ring-2 focus:ring-[var(--aw-primary)]/25'

/**
 * The signed-in listener's own account (RFC 0005): the email and whether it is confirmed, the
 * password, and the sessions. An account from the dev issuer has no password (emailVerified is
 * absent); it gets a log-out button only.
 */
export function AccountSettings() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const applySession = useAuthStore((s) => s.applySession)
  const logout = useAuthStore((s) => s.logout)
  const showToast = useToastStore((s) => s.showToast)
  const hasPassword = typeof user?.emailVerified === 'boolean'

  const [changing, setChanging] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      applySession(await changePassword(current, next))
      setChanging(false)
      setCurrent('')
      setNext('')
      showToast('Password changed. Other devices are signed out')
    } catch (err) {
      setError(describeError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">Account</h2>

      <div className="rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4">
        <p className="text-sm text-[var(--aw-muted)]">Signed in as</p>
        <p className="mt-0.5 font-medium text-[var(--aw-text)]">{user?.email}</p>
        {hasPassword ? (
          user.emailVerified ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--aw-muted)]">
              <BadgeCheck className="size-4 text-[var(--aw-primary)]" aria-hidden /> Email confirmed
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-[var(--aw-text)]">
                <MailWarning className="size-4 text-[var(--aw-gold)]" aria-hidden /> Email not confirmed yet
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await resendVerification()
                    showToast('Confirmation email sent')
                  } catch (err) {
                    showToast(describeError(err))
                  }
                }}
                className="font-semibold text-[var(--aw-primary)] hover:underline"
              >
                Send the link again
              </button>
            </div>
          )
        ) : null}
      </div>

      {hasPassword ? (
        changing ? (
          <form onSubmit={submitPassword} className="space-y-3 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4">
            <p className="font-medium text-[var(--aw-text)]">Change password</p>
            <input className={INPUT} type="password" autoComplete="current-password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} required aria-label="Current password" />
            <input className={INPUT} type="password" autoComplete="new-password" placeholder="New password (8+ characters)" value={next} onChange={(e) => setNext(e.target.value)} required aria-label="New password" />
            {error ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setChanging(false); setError('') }} className="rounded-full px-4 py-2 text-sm font-medium text-[var(--aw-muted)] hover:text-[var(--aw-text)]">
                Cancel
              </button>
              <button type="submit" disabled={pending} className="rounded-full bg-[var(--aw-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {pending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setChanging(true)} className={ROW}>
            <KeyRound className="size-5 shrink-0 text-[var(--aw-primary)]" />
            <span className="font-medium text-[var(--aw-text)]">Change password</span>
          </button>
        )
      ) : null}

      {hasPassword ? (
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm('Sign out on every device, this one included?')) return
            try {
              await signOutEverywhere()
            } catch {
              // Signed out here either way.
            }
            signOut()
          }}
          className={ROW}
        >
          <MonitorSmartphone className="size-5 shrink-0 text-[var(--aw-primary)]" />
          <span>
            <span className="font-medium text-[var(--aw-text)]">Sign out everywhere</span>
            <span className="mt-1 block text-sm text-[var(--aw-muted)]">On a lost phone or a shared computer, end every session at once.</span>
          </span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={signOut}
        className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-left text-red-800 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
      >
        <LogOut className="size-5 shrink-0" />
        <span className="font-semibold">Log out</span>
      </button>
    </section>
  )
}
