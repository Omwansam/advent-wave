import { useNavigate } from 'react-router-dom'
import { KeyRound, LogOut } from 'lucide-react'
import { Button } from '../components/Button'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { Notice } from '../components/Notice'
import { useAuthStore } from '../store/useAuthStore'

/**
 * Shown after signing in with a password someone else chose (a new account, a reset). Until it
 * is replaced the gateway allows nothing else, so there is nothing else to show.
 */
export function ForcedPasswordChange() {
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--aw-primary)] to-[#8b7cff] text-white shadow-lg shadow-[var(--aw-primary)]/30">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Choose your password</h1>
            <p className="text-xs text-[var(--aw-muted)]">{account?.email}</p>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] p-5 shadow-[var(--aw-shadow-card)]">
          <Notice tone="info">
            You signed in with a temporary password. Replace it with one only you know to continue.
          </Notice>
          <ChangePasswordForm onChanged={() => navigate('/', { replace: true })} />
        </div>
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            icon={LogOut}
            onClick={async () => {
              await signOut()
              navigate('/sign-in', { replace: true })
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
