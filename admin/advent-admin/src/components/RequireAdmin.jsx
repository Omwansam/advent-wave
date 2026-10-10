import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { NoAccess } from './NoAccess'

/**
 * Route guards. They decide what to render; the gateway decides what is allowed, on every
 * request, from the stored account.
 *
 * - No session: the sign-in screen, then back where the person was going.
 * - A temporary password: only the password change, which is all the gateway allows then.
 * - `permission`: the page needs it; without it, a page that says so instead of one whose
 *   every request would be refused.
 */
export function RequireAdmin({ children, permission, allowPendingPassword = false }) {
  const token = useAuthStore((s) => s.token)
  const account = useAuthStore((s) => s.account)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />
  }
  if (account?.mustChangePassword && !allowPendingPassword) {
    return <Navigate to="/account/password" replace />
  }
  if (permission && !account?.permissions?.includes(permission)) {
    return <NoAccess permission={permission} />
  }
  return children
}
