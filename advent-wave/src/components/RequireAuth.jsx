import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export function RequireAuth() {
  // The token, not the user object, is what makes a request succeed — gate on that, so a
  // rehydrated session with a cleared token cannot render pages that will 401 on every call.
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    )
  }

  return <Outlet />
}
