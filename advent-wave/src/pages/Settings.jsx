import { Link } from 'react-router-dom'
import {
  ChevronRight,
  EyeOff,
  Infinity as InfinityIcon,
  Moon,
  Sun,
  Users,
  Volume2,
  Waves,
} from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { AccountSettings } from '../components/AccountSettings'

/**
 * What the stream manifest picks for each setting (plan §11.2). Speech uses a lighter ladder, so
 * a sermon on High is 128 kbps, not 160 — the same choice, sized for a voice.
 */
const QUALITY = [
  { id: 'data_saver', label: 'Data saver', detail: 'About 24 kbps. For patchy mobile data.' },
  { id: 'normal', label: 'Normal', detail: 'About 96 kbps for music, 64 for sermons.' },
  { id: 'high', label: 'High', detail: 'About 160 kbps for music, 128 for sermons.' },
  { id: 'very_high', label: 'Very high', detail: 'About 320 kbps for music.' },
]

export function Settings() {
  const audioQuality = useUiStore((s) => s.audioQuality)
  const setAudioQuality = useUiStore((s) => s.setAudioQuality)
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
  const autoplay = useUiStore((s) => s.autoplay)
  const setAutoplay = useUiStore((s) => s.setAutoplay)
  const shareActivity = useUiStore((s) => s.shareActivity)
  const setShareActivity = useUiStore((s) => s.setShareActivity)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold text-[var(--aw-text)]">Settings</h1>
      <p className="mt-2 text-[var(--aw-muted)]">
        Playback, appearance and your account. Saved to your account, so they
        follow you to every device.
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
        <fieldset className="rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4">
          <legend className="sr-only">Streaming quality</legend>
          <div className="flex items-start gap-3">
            <Volume2 className="mt-0.5 size-5 shrink-0 text-[var(--aw-primary)]" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[var(--aw-text)]">Streaming quality</p>
              <p className="mt-1 text-sm text-[var(--aw-muted)]">
                Takes effect from the next song or sermon.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {QUALITY.map((q) => (
                  <label
                    key={q.id}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-sm transition ${
                      audioQuality === q.id
                        ? 'border-[var(--aw-primary)] bg-[var(--aw-primary)]/10 text-[var(--aw-text)]'
                        : 'border-[var(--aw-border)] text-[var(--aw-muted)] hover:text-[var(--aw-text)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="audio-quality"
                      value={q.id}
                      checked={audioQuality === q.id}
                      onChange={() => setAudioQuality(q.id)}
                      className="sr-only"
                    />
                    <span className="block font-semibold">{q.label}</span>
                    <span className="mt-0.5 block text-xs">{q.detail}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </fieldset>
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
                Plays a studio hymn and a camp-meeting recording at the same
                loudness, using the level measured from each master.
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
              <p className="font-medium text-[var(--aw-text)]">Crossfade songs</p>
              <p className="mt-1 text-sm text-[var(--aw-muted)]">
                Blend the end of one song into the start of the next. Sermons
                and podcasts always play to their last word.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={crossfadeEnabled}
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

      <section className="mt-3 space-y-3">
        <button
          type="button"
          role="switch"
          aria-checked={autoplay}
          onClick={() => setAutoplay(!autoplay)}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4 text-left transition hover:bg-[var(--aw-surface-elevated)]"
        >
          <span className="flex items-center gap-3">
            <InfinityIcon className="size-5 text-[var(--aw-primary)]" />
            <span>
              <span className="font-medium text-[var(--aw-text)]">Autoplay</span>
              <span className="mt-1 block text-sm text-[var(--aw-muted)]">
                When your queue ends, keep playing something like what you were
                listening to.
              </span>
            </span>
          </span>
          <span
            className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
              autoplay ? 'bg-[var(--aw-primary)]' : 'bg-[var(--aw-border)]'
            }`}
            aria-hidden
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${
                autoplay ? 'left-6' : 'left-1'
              }`}
            />
          </span>
        </button>
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
                While it is on, nothing you play reaches your history, your
                recommendations or the people who follow you, and what they could
                see before is removed.
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
        <button
          type="button"
          role="switch"
          aria-checked={shareActivity}
          onClick={() => setShareActivity(!shareActivity)}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4 text-left transition hover:bg-[var(--aw-surface-elevated)]"
        >
          <span className="flex items-center gap-3">
            <Users className="size-5 text-[var(--aw-primary)]" />
            <span>
              <span className="font-medium text-[var(--aw-text)]">
                Share my listening activity
              </span>
              <span className="mt-1 block text-sm text-[var(--aw-muted)]">
                The people who follow you see what you are playing and what you
                played last. Turning it off also removes what they can see now.
              </span>
            </span>
          </span>
          <span
            className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
              shareActivity ? 'bg-[var(--aw-primary)]' : 'bg-[var(--aw-border)]'
            }`}
            aria-hidden
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${
                shareActivity ? 'left-6' : 'left-1'
              }`}
            />
          </span>
        </button>
        <Link
          to="/friends"
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-4 text-left transition hover:bg-[var(--aw-surface-elevated)]"
        >
          <span className="font-medium text-[var(--aw-text)]">Find and manage friends</span>
          <ChevronRight className="size-5 text-[var(--aw-muted)]" />
        </Link>
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

      <AccountSettings />

      <section className="mt-8 rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] p-6">
        <h2 className="font-semibold text-[var(--aw-text)]">About AdventWave</h2>
        <p className="mt-2 text-sm text-[var(--aw-muted)]">
          Worship music, sermons and podcasts from Seventh-day Adventist churches,
          shared with their consent. Every recording here is licensed by the church
          that made it.
        </p>
      </section>
    </div>
  )
}
