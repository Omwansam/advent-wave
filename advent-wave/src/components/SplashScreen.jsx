import { Sparkles } from 'lucide-react'

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--aw-bg)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(109,93,246,0.35), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(201,162,39,0.2), transparent)',
        }}
      />
      <div className="relative flex flex-col items-center gap-6 px-6 text-center">
        <div className="aw-splash-logo flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--aw-primary)] to-[#8b7cff] text-white shadow-2xl shadow-[var(--aw-primary)]/40 md:size-28">
          <Sparkles className="size-12 md:size-14" aria-hidden />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--aw-text)] md:text-4xl">
            AdventWave
          </h1>
          <p className="mt-2 text-sm text-[var(--aw-muted)] md:text-base">
            Worship, sermons & podcasts
          </p>
        </div>
        <div className="flex gap-1.5 pt-4" aria-hidden>
          <span className="aw-splash-dot size-2 rounded-full bg-[var(--aw-primary)]" />
          <span className="aw-splash-dot size-2 rounded-full bg-[var(--aw-primary)]/60" />
          <span className="aw-splash-dot size-2 rounded-full bg-[var(--aw-primary)]/30" />
        </div>
      </div>
    </div>
  )
}
