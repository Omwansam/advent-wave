import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { useAuthStore } from '../store/useAuthStore'
import { useCatalogStore } from '../store/useCatalogStore'

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const loadCatalog = useCatalogStore((s) => s.load)
  const refreshAccount = useAuthStore((s) => s.refresh)

  // Artist and church names are needed on almost every screen; fetch them once per session.
  // The account is re-read too: a role changed by a super admin shows without signing in again.
  useEffect(() => {
    loadCatalog()
    refreshAccount()
  }, [loadCatalog, refreshAccount])

  return (
    <div className="min-h-svh">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="md:pl-[var(--aw-sidebar-w)]">
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-[var(--aw-border)] bg-[var(--aw-nav-bg)] px-4 py-2 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-[var(--aw-muted)] hover:bg-[var(--aw-surface-elevated)]"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-semibold">AdventWave Admin</span>
        </div>

        <main key={location.pathname} className="aw-page-enter mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
