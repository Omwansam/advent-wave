import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUiStore } from '../store/useUiStore'

const MOCK_FRIENDS = [
  {
    id: 'f1',
    name: 'Maya K.',
    avatar: 'https://picsum.photos/seed/friend-maya/80/80',
    track: 'It Is Well',
    artist: 'Adventist Youth Choir',
  },
  {
    id: 'f2',
    name: 'Jonas R.',
    avatar: 'https://picsum.photos/seed/friend-jonas/80/80',
    track: 'Faith on the Front Lines',
    artist: 'Adventist World Radio',
  },
  {
    id: 'f3',
    name: 'Sofia L.',
    avatar: 'https://picsum.photos/seed/friend-sofia/80/80',
    track: 'Cornerstone',
    artist: 'Urban Praise',
  },
]

export function FriendActivityPanel() {
  const privateSession = useUiStore((s) => s.privateSession)
  const collapsed = useUiStore((s) => s.friendActivityCollapsed)
  const toggleFriendActivity = useUiStore((s) => s.toggleFriendActivity)

  if (privateSession) return null

  if (collapsed) {
    return (
      <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-0 top-14 z-20 hidden w-10 flex-col items-center border-l border-[var(--aw-border)] bg-[var(--aw-nav-bg)]/95 py-3 backdrop-blur-md 2xl:flex">
        <button
          type="button"
          onClick={toggleFriendActivity}
          className="rounded-lg p-2 text-[var(--aw-muted)] hover:bg-black/5 hover:text-[var(--aw-primary)] dark:hover:bg-white/10"
          title="Show friend activity"
          aria-label="Show friend activity"
        >
          <ChevronLeft className="size-5" />
        </button>
        <Users className="mt-4 size-5 text-[var(--aw-muted)]" aria-hidden />
      </div>
    )
  }

  return (
    <aside className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-0 top-14 z-20 hidden w-72 flex-col border-l border-[var(--aw-border)] bg-[var(--aw-nav-bg)]/95 backdrop-blur-md 2xl:flex">
      <div className="flex items-center justify-between border-b border-[var(--aw-border)] px-4 py-3">
        <h2 className="text-sm font-bold text-[var(--aw-text)]">
          Friend activity
        </h2>
        <button
          type="button"
          onClick={toggleFriendActivity}
          className="rounded-full p-1.5 text-[var(--aw-muted)] hover:bg-black/5 hover:text-[var(--aw-text)] dark:hover:bg-white/10"
          title="Collapse"
          aria-label="Collapse friend activity"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <p className="px-4 py-2 text-xs text-[var(--aw-muted)]">
        Mock feed — hides entirely in a private session (like Spotify).
      </p>
      <ul className="flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
        {MOCK_FRIENDS.map((f) => (
          <li key={f.id} className="mb-3">
            <div className="flex gap-3 rounded-xl p-2 transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
              <img
                src={f.avatar}
                alt=""
                className="size-10 shrink-0 rounded-full object-cover ring-2 ring-[var(--aw-gold)]/20"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--aw-text)]">
                  {f.name}
                </p>
                <p className="truncate text-xs text-[var(--aw-muted)]">
                  <span className="text-[var(--aw-text)]/90">{f.track}</span>
                  <span className="mx-1">·</span>
                  <Link
                    to={`/artist/${encodeURIComponent(f.artist)}`}
                    className="hover:underline"
                  >
                    {f.artist}
                  </Link>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
