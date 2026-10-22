import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ChevronsLeft,
  Clock,
  Compass,
  Heart,
  Home,
  LayoutGrid,
  Library,
  LogOut,
  Menu,
  Mic2,
  MonitorDown,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { useAuthStore } from '../store/useAuthStore'
import { UserAvatar } from './Friends'
import { isDesktopApp } from '../utils/desktop'

const nav = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/search', label: 'Search', Icon: Search },
  { to: '/browse', label: 'Browse', Icon: LayoutGrid },
  { to: '/discover', label: 'Discover', Icon: Compass },
  { to: '/library', label: 'Library', Icon: Library },
  { to: '/liked', label: 'Liked songs', Icon: Heart },
  { to: '/history', label: 'Listening history', Icon: Clock },
  { to: '/artists', label: 'Your artists', Icon: UserRound },
  { to: '/friends', label: 'Friends', Icon: Users },
  { to: '/podcasts', label: 'Podcasts', Icon: Mic2 },
  { to: '/sermons', label: 'Sermons', Icon: BookOpen },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

function SidebarShell({ compact, onClose }) {
  const navigate = useNavigate()
  const setCreatePlaylistOpen = useUiStore((s) => s.setCreatePlaylistOpen)
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const authUser = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleCreate = () => {
    setCreatePlaylistOpen(true)
    onClose?.()
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
    onClose?.()
  }

  return (
    <div
      className={`flex h-full flex-col border-r border-[var(--aw-border)] bg-[var(--aw-sidebar-bg)] py-6 ${
        compact ? 'px-2' : 'px-3'
      }`}
    >
      <Link
        to="/"
        className={`mb-8 flex items-center gap-2 ${compact ? 'justify-center px-0' : 'px-2'}`}
        onClick={() => onClose?.()}
        title="AdventWave home"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--aw-primary)] to-[#8b7cff] text-white shadow-lg shadow-[var(--aw-primary)]/30">
          <Sparkles className="size-5" aria-hidden />
        </span>
        {!compact ? (
          <span className="truncate text-lg font-bold tracking-tight text-[var(--aw-text)]">
            AdventWave
          </span>
        ) : null}
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const NavIcon = item.Icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={item.label}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                `flex items-center rounded-xl py-2.5 text-sm font-medium transition ${
                  compact ? 'justify-center px-2' : 'gap-3 px-3'
                } ${
                  isActive
                    ? 'bg-[var(--aw-primary)]/12 text-[var(--aw-primary)]'
                    : 'text-[var(--aw-muted)] hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)]'
                }`
              }
            >
              <NavIcon className="size-5 shrink-0" aria-hidden />
              {!compact ? <span className="truncate">{item.label}</span> : null}
            </NavLink>
          )
        })}
      </nav>

      {isDesktopApp ? null : (
        <Link
          to="/download"
          onClick={() => onClose?.()}
          title="Get the desktop app"
          className={`mb-2 flex items-center rounded-xl py-2.5 text-sm font-medium text-[var(--aw-muted)] transition hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)] ${
            compact ? 'justify-center px-2' : 'gap-3 px-3'
          }`}
        >
          <MonitorDown className="size-5 shrink-0" aria-hidden />
          {!compact ? <span className="truncate">Get the desktop app</span> : null}
        </Link>
      )}

      <button
        type="button"
        onClick={toggleSidebar}
        className={`mb-2 hidden items-center justify-center gap-2 rounded-xl border border-transparent py-2.5 text-sm font-medium text-[var(--aw-muted)] transition hover:border-[var(--aw-border)] hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)] md:flex ${
          compact ? 'px-2' : 'px-3'
        }`}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronsLeft
          className={`size-5 shrink-0 transition ${collapsed ? 'rotate-180' : ''}`}
        />
        {!compact ? <span>Collapse</span> : null}
      </button>

      <button
        type="button"
        onClick={handleCreate}
        title="Create playlist"
        className={`mt-0 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--aw-primary)]/40 bg-[var(--aw-primary)]/5 py-3 text-sm font-semibold text-[var(--aw-primary)] transition hover:border-[var(--aw-primary)] hover:bg-[var(--aw-primary)]/10 ${
          compact ? 'px-2' : 'px-3'
        }`}
      >
        <Plus className="size-4 shrink-0" />
        {!compact ? <span>Create playlist</span> : null}
      </button>

      <div
        className={`mt-6 flex flex-col gap-2 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10 ${
          compact ? 'items-center p-2' : ''
        }`}
      >
        <div
          className={`flex items-center gap-3 ${compact ? 'justify-center' : ''}`}
        >
          <UserAvatar name={authUser?.name ?? 'Listener'} />
          {!compact ? (
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-[var(--aw-text)]">
                {authUser?.name ?? 'Listener'}
              </p>
              <p className="truncate text-xs text-[var(--aw-muted)]">
                {authUser?.email ?? ''}
              </p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Log out"
          className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-[var(--aw-muted)] transition hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)] ${
            compact ? 'w-full px-2' : 'px-2'
          }`}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {!compact ? <span>Log out</span> : null}
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ mobileOpen, onClose }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[var(--aw-sidebar-w)] overflow-hidden md:block">
        <SidebarShell compact={collapsed} onClose={onClose} />
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!mobileOpen}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[min(100vw-3rem,18rem)] max-w-[calc(100vw-2rem)] transform bg-[var(--aw-bg)] shadow-2xl transition-transform md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-2 text-[var(--aw-muted)] hover:bg-black/5"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
        <SidebarShell compact={false} onClose={onClose} />
      </aside>
    </>
  )
}

export function SidebarMenuButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full p-2 text-[var(--aw-text)] hover:bg-black/5 md:hidden dark:hover:bg-white/10"
      aria-label="Open menu"
    >
      <Menu className="size-6" />
    </button>
  )
}
