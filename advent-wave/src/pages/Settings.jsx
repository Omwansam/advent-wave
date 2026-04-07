import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ExternalLink,
  EyeOff,
  LogOut,
  Moon,
  Sun,
  Volume2,
  Waves,
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useUiStore } from '../store/useUiStore'

export function Settings() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const privateSession = useUiStore((s) => s.privateSession)
  const togglePrivateSession = useUiStore((s) => s.togglePrivateSession)
  const normalizeAudio = useUiStore((s) => s.normalizeAudio)
  const setNormalizeAudio = useUiStore((s) => s.setNormalizeAudio)
  const crossfadeEnabled = useUiStore((s) => s.crossfadeEnabled)
  const setCrossfadeEnabled = useUiStore((s) => s.setCrossfadeEnabled)
  const crossfadeSec = useUiStore((s) => s.crossfadeSec)
  const setCrossfadeSec = useUiStore((s) => s.setCrossfadeSec)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold text-[var(--aw-text)]">Settings</h1>
      <p className="mt-2 text-[var(--aw-muted)]">
        Playback, appearance, and account — Spotify-style preferences (mock
        where noted).
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
          Appearance
        </h2>
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4 text-left transition hover:bg-[var(--aw-surface-elevated)]"
        >
          <span className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="size-5 text-[var(--aw-primary)]" />
            ) : (
              <Sun className="size-5 text-[var(--aw-gold)]" />
            )}
            <span className="font-medium text-[var(--aw-text)]">
              Theme: {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </span>
          <ChevronRight className="size-5 text-[var(--aw-muted)]" />
        </button>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
          Playback
        </h2>
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4">
          <Volume2 className="mt-0.5 size-5 shrink-0 text-[var(--aw-primary)]" />
          <div>
            <p className="font-medium text-[var(--aw-text)]">Streaming quality</p>
            <p className="mt-1 text-sm text-[var(--aw-muted)]">
              High (demo) — Ogg 320kbps equivalent when you plug in a CDN.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNormalizeAudio(!normalizeAudio)}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4 text-left transition hover:bg-[var(--aw-surface-elevated)]"
        >
          <span className="flex items-center gap-3">
            <Waves className="size-5 text-[var(--aw-gold)]" />
            <span>
              <span className="font-medium text-[var(--aw-text)]">
                Normalize volume
              </span>
              <span className="mt-1 block text-sm text-[var(--aw-muted)]">
                Evens out loud and quiet tracks (mock — wire to Web Audio when
                ready).
              </span>
            </span>
          </span>
          <span
            className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
              normalizeAudio ? 'bg-[var(--aw-primary)]' : 'bg-[var(--aw-border)]'
            }`}
            aria-hidden
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${
                normalizeAudio ? 'left-6' : 'left-1'
              }`}
            />
          </span>
        </button>
        <div className="rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-[var(--aw-text)]">Crossfade</p>
              <p className="mt-1 text-sm text-[var(--aw-muted)]">
                Blend between songs like Spotify Desktop (UI only in this demo).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCrossfadeEnabled(!crossfadeEnabled)}
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
                crossfadeEnabled
                  ? 'bg-[var(--aw-primary)]'
                  : 'bg-[var(--aw-border)]'
              }`}
              aria-label={crossfadeEnabled ? 'Crossfade on' : 'Crossfade off'}
            >
              <span
                className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${
                  crossfadeEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
          {crossfadeEnabled ? (
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
              Duration ({crossfadeSec}s)
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={crossfadeSec}
                onChange={(e) => setCrossfadeSec(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--aw-primary)]"
              />
            </label>
          ) : null}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
          Social & privacy
        </h2>
        <button
          type="button"
          onClick={togglePrivateSession}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4 text-left transition hover:bg-[var(--aw-surface-elevated)]"
        >
          <span className="flex items-center gap-3">
            <EyeOff className="size-5 text-[var(--aw-primary)]" />
            <span>
              <span className="font-medium text-[var(--aw-text)]">
                Private session
              </span>
              <span className="mt-1 block text-sm text-[var(--aw-muted)]">
                Hides friend activity and listening from the mock social rail.
              </span>
            </span>
          </span>
          <span
            className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
              privateSession ? 'bg-[var(--aw-primary)]' : 'bg-[var(--aw-border)]'
            }`}
            aria-hidden
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${
                privateSession ? 'left-6' : 'left-1'
              }`}
            />
          </span>
        </button>
        <Link
          to="/history"
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4 text-left transition hover:bg-[var(--aw-surface-elevated)]"
        >
          <span className="font-medium text-[var(--aw-text)]">
            View listening history
          </span>
          <ChevronRight className="size-5 text-[var(--aw-muted)]" />
        </Link>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
          Account
        </h2>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-left text-red-800 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
        >
          <LogOut className="size-5 shrink-0" />
          <span className="font-semibold">Log out</span>
        </button>
      </section>

      <section className="mt-8 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] p-6">
        <h2 className="font-semibold text-[var(--aw-text)]">About AdventWave</h2>
        <p className="mt-2 text-sm text-[var(--aw-muted)]">
          MVP streaming shell for faith-centered content. Replace mock data and
          auth with your production API.
        </p>
        <a
          href="https://github.com"
          className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--aw-primary)]"
          target="_blank"
          rel="noreferrer"
        >
          Documentation
          <ExternalLink className="size-4" />
        </a>
      </section>
    </div>
  )
}
