import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Church,
  ClipboardCheck,
  LayoutDashboard,
  Library,
  LogOut,
  Mic2,
  Moon,
  ShieldCheck,
  Sun,
  Upload,
  UserCog,
  X,
} from 'lucide-react'
import { PERMISSIONS, roleLabel } from '../lib/roles'
import { useAuthStore } from '../store/useAuthStore'
import { useUiStore } from '../store/useUiStore'

/** `permission`: shown only to roles that hold it — the gateway refuses the rest anyway. */
const NAV = [
  { section: 'Catalogue' },
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/media/new', label: 'Add media', Icon: Upload, permission: PERMISSIONS.MEDIA_WRITE },
  { to: '/media', label: 'Media library', Icon: Library, end: true },
  { to: '/review', label: 'Review queue', Icon: ClipboardCheck },
  { section: 'Contributors' },
  { to: '/churches', label: 'Churches', Icon: Church },
  { to: '/artists', label: 'Artists', Icon: Mic2 },
  { section: 'Administration', permission: PERMISSIONS.ADMINS_MANAGE },
  { to: '/accounts', label: 'Admin accounts', Icon: UserCog, permission: PERMISSIONS.ADMINS_MANAGE },
]

function SidebarContent({ onNavigate }) {
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const signOut = useAuthStore((s) => s.signOut)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const permissions = account?.permissions ?? []
  const nav = NAV.filter((item) => !item.permission || permissions.includes(item.permission))

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="flex h-full flex-col border-r border-[var(--aw-border)] bg-[var(--aw-sidebar-bg)] px-3 py-5">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--aw-primary)] to-[#8b7cff] text-white shadow-lg shadow-[var(--aw-primary)]/30">
          <ShieldCheck className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight">AdventWave</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--aw-gold)]">Admin</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5" aria-label="Admin">
        {nav.map((item) =>
          item.section ? (
            <p
              key={item.section}
              className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--aw-muted)] first:mt-0"
            >
              {item.section}
            </p>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[var(--aw-primary)]/12 text-[var(--aw-primary)]'
                    : 'text-[var(--aw-muted)] hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)]'
                }`
              }
            >
              <item.Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ),
        )}
      </nav>

      <div className="mt-4 space-y-1 border-t border-[var(--aw-border)] pt-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--aw-muted)] transition hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)]"
        >
          {theme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          {theme === 'dark' ? 'Light theme' : 'Dark theme'}
        </button>
        <Link
          to="/account"
          onClick={onNavigate}
          className="block rounded-lg px-3 py-1.5 transition hover:bg-[var(--aw-surface-elevated)]"
          title="My account"
        >
          <p className="truncate text-xs font-semibold">{account?.displayName ?? 'Administrator'}</p>
          <p className="truncate text-[11px] text-[var(--aw-muted)]">{account?.email}</p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--aw-gold)]">
            {roleLabel(account?.role)}
          </p>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--aw-muted)] transition hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)]"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-[var(--aw-sidebar-w)] md:block">
        <SidebarContent />
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 max-w-[calc(100vw-3rem)] transition-transform md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-[var(--aw-muted)] hover:bg-[var(--aw-surface-elevated)]"
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </>
  )
}
