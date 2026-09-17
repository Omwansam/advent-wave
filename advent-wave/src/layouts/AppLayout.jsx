import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Navbar } from '../components/Navbar'
import { MusicPlayer } from '../components/MusicPlayer'
import { QueueDrawer } from '../components/QueueDrawer'
import { ConnectDeviceModal } from '../components/ConnectDeviceModal'
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal'
import { ToastHost } from '../components/ToastHost'
import { CreatePlaylistModal } from '../components/CreatePlaylistModal'
import { FriendActivityPanel } from '../components/FriendActivityPanel'
import { useUiStore } from '../store/useUiStore'
import { useAuthStore } from '../store/useAuthStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { usePlayerSync } from '../hooks/usePlayerSync'

const LEGACY_THEME_KEY = 'adventwave-theme'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const handleSearchChange = (value) => {
    setSearch(value)
    if (location.pathname === '/search') {
      const t = value.trim()
      navigate(t ? `/search?q=${encodeURIComponent(t)}` : '/search', {
        replace: true,
      })
    }
  }

  const token = useAuthStore((s) => s.token)
  const loadLibrary = useLibraryStore((s) => s.load)
  const hydrateSettings = useUiStore((s) => s.hydrateSettings)

  // Every page reads likes, follows and playlists from this store, and settings decide what
  // the server does with playback, so both are fetched once here rather than per page.
  useEffect(() => {
    if (!token) return
    loadLibrary()
    hydrateSettings()
  }, [token, loadLibrary, hydrateSettings])

  // Resume where this account stopped, and keep the server's copy of the player current.
  usePlayerSync(token)

  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const setTheme = useUiStore((s) => s.setTheme)
  const privateSession = useUiStore((s) => s.privateSession)
  const friendActivityCollapsed = useUiStore((s) => s.friendActivityCollapsed)

  const mainFriendMargin =
    privateSession ? '' : friendActivityCollapsed ? '2xl:mr-10' : '2xl:mr-72'

  useEffect(() => {
    const legacy = localStorage.getItem(LEGACY_THEME_KEY)
    if (legacy === 'dark' || legacy === 'light') {
      setTheme(legacy)
      localStorage.removeItem(LEGACY_THEME_KEY)
    }
  }, [setTheme])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--aw-sidebar-w',
      sidebarCollapsed ? '4.5rem' : '16rem',
    )
  }, [sidebarCollapsed])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '?') return
      const el = document.activeElement
      const tag = el?.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el?.isContentEditable
      ) {
        return
      }
      e.preventDefault()
      useUiStore.getState().setShortcutsOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const searchContext = useMemo(
    () => ({ search, setSearch }),
    [search],
  )

  return (
    <div className="min-h-svh bg-[var(--aw-bg)] text-[var(--aw-text)]">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <Navbar
        search={search}
        onSearchChange={handleSearchChange}
        onMenuClick={() => setMobileOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main
        className={`min-h-svh pb-[calc(88px+env(safe-area-inset-bottom))] pt-14 md:ml-[var(--aw-sidebar-w)] ${mainFriendMargin}`}
      >
        <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-6 md:px-8">
          <div key={location.pathname} className="aw-page-enter">
            <Outlet context={searchContext} />
          </div>
        </div>
      </main>

      <ConnectDeviceModal />
      <KeyboardShortcutsModal />
      <CreatePlaylistModal />
      <ToastHost />
      <FriendActivityPanel />
      <QueueDrawer />
      <MusicPlayer />
    </div>
  )
}
