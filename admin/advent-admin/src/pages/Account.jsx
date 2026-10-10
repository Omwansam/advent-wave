import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, LogOut } from 'lucide-react'
import { Button } from '../components/Button'
import { Card, CardHeader, DefinitionList } from '../components/Card'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { Chip } from '../components/Chip'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { useAction } from '../hooks/useAction'
import { formatDateTime } from '../lib/format'
import { PERMISSION_LABEL, roleLabel } from '../lib/roles'
import { useAuthStore } from '../store/useAuthStore'

export function Account() {
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const signOut = useAuthStore((s) => s.signOut)
  const [changedAt, setChangedAt] = useState(null)
  const everywhere = useAction()

  if (!account) return null

  return (
    <>
      <PageHeader title="My account" description="Who you are signed in as, and what your role allows." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" actions={<Chip tone="primary">{roleLabel(account.role)}</Chip>} />
          <DefinitionList
            items={[
              ['Name', account.displayName],
              ['Email', account.email],
              ['Last sign-in', formatDateTime(account.lastLoginAt)],
            ]}
          />
          <div className="border-t border-[var(--aw-border)] px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--aw-muted)]">Your role allows</p>
            <ul className="space-y-1">
              {account.permissions.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-[var(--aw-ok)]" aria-hidden />
                  {PERMISSION_LABEL[p] ?? p}
                  <span className="aw-mono text-[var(--aw-muted)]">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Change password" description="Ends your other sessions; this one continues." />
            <div className="space-y-3 p-4">
              {changedAt ? (
                <Notice tone="ok">Password changed at {formatDateTime(changedAt)}. Your other sessions have ended.</Notice>
              ) : null}
              <ChangePasswordForm onChanged={() => setChangedAt(new Date().toISOString())} />
            </div>
          </Card>
          <Card>
            <CardHeader
              title="Sign out everywhere"
              description="Ends every session of this account, on every device, including this one."
            />
            <div className="space-y-2 p-4">
              <Notice tone="info">Use it if you signed in on a shared computer or think your password leaked.</Notice>
              <Button
                variant="danger"
                icon={LogOut}
                pending={everywhere.pending}
                onClick={() =>
                  everywhere.run(async () => {
                    await signOut({ everywhere: true, notice: 'Every session of your account has ended.' })
                    navigate('/sign-in', { replace: true })
                  })
                }
              >
                Sign out everywhere
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
