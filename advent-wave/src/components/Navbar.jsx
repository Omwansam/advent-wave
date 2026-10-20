import { HelpCircle, Moon, Sun } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SearchBar } from './SearchBar'
import { SidebarMenuButton } from './Sidebar'
import { WhatsNewMenu } from './WhatsNewMenu'
import { UserAvatar } from './Friends'
import { useAuthStore } from '../store/useAuthStore'
import { useUiStore } from '../store/useUiStore'

export function Navbar({
  search,
  onSearchChange,
  onMenuClick,
  theme,
  onToggleTheme,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const onSearchPage = location.pathname === '/search'
  const urlHasQ = searchParams.has('q')
  const urlQ = searchParams.get('q') ?? ''
  const displaySearch =
    onSearchPage && urlHasQ ? urlQ : search
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen)

  const submitSearch = () => {
    const q = displaySearch.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
    else navigate('/search')
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--aw-border)] bg-[var(--aw-nav-bg)]/90 px-3 backdrop-blur-md md:left-[var(--aw-sidebar-w)] md:px-6">
      {onMenuClick ? <SidebarMenuButton onClick={onMenuClick} /> : null}

      <SearchBar
        value={displaySearch}
        onChange={onSearchChange}
        onSubmit={submitSearch}
        className="max-w-xl"
      />

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <WhatsNewMenu />
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="hidden rounded-full p-2 text-[var(--aw-muted)] transition hover:bg-black/5 hover:text-[var(--aw-text)] sm:block dark:hover:bg-white/10"
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <HelpCircle className="size-5" />
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-full p-2 text-[var(--aw-muted)] transition hover:bg-black/5 hover:text-[var(--aw-text)] dark:hover:bg-white/10"
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </button>
        {user?.id ? (
          <Link to={`/user/${user.id}`} title="Your profile" aria-label="Your profile">
            <UserAvatar name={user.name} />
          </Link>
        ) : null}
      </div>
    </header>
  )
}
