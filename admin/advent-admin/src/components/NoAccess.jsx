import { ShieldOff } from 'lucide-react'
import { PERMISSION_LABEL, roleLabel } from '../lib/roles'
import { useAuthStore } from '../store/useAuthStore'
import { ButtonLink } from './Button'

/** A page the signed-in role cannot use. The gateway would refuse its requests anyway. */
export function NoAccess({ permission }) {
  const role = useAuthStore((s) => s.account?.role)
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <ShieldOff className="mx-auto size-10 text-[var(--aw-muted)]" aria-hidden />
      <h1 className="mt-3 text-lg font-bold">Your role cannot use this page</h1>
      <p className="mt-1 text-sm text-[var(--aw-muted)]">
        It needs “{PERMISSION_LABEL[permission] ?? permission}” (<span className="aw-mono">{permission}</span>), which{' '}
        {roleLabel(role)} does not have. A super admin can change your role.
      </p>
      <ButtonLink to="/" variant="primary" className="mt-5">
        Go to the dashboard
      </ButtonLink>
    </div>
  )
}
