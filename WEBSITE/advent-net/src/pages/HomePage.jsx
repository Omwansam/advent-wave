import { Link } from 'react-router-dom'
import {
  ArrowRight,
  AudioLines,
  BookOpenText,
  Church,
  Download,
  Globe,
  HandHeart,
  Headphones,
  ListMusic,
  Mic2,
  MonitorDown,
  Music2,
  Smartphone,
  Timer,
  Users,
} from 'lucide-react'
import { appUrl, formatCount, formatDuration } from '../lib/adventwave'
import { UNREACHABLE, useRelease, useSite } from '../lib/useLive'

/**
 * The official AdventWave website. The Flow Wave scene is behind it (Layout); scrolling this page
 * is what flies the camera down into the wave. Everything about the catalogue is live, from
 * `GET /v1/site` — the page reads correctly without it, it just has no numbers to show.
 */
export function HomePage() {
  // Unreachable reads the same as "nothing yet" here: the page without live numbers.
  const answer = useSite()
  const site = answer === UNREACHABLE ? null : answer
  return (
    <>
      <Hero site={site} />
      <Numbers site={site} />
      <Listen site={site} />
      <Features />
      <Churches site={site} />
      <Everywhere />
      <Closing />
    </>
  )
}

function Eyebrow({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.22em] text-aw-gold">{children}</p>
}

function Section({ id, className = '', children, ...rest }) {
  return (
    <section id={id} className={`relative mx-auto max-w-6xl scroll-mt-28 px-4 sm:px-6 ${className}`} {...rest}>
      {children}
    </section>
  )
}

function Hero({ site }) {
  const t = site?.totals
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 pb-24 pt-32 text-center">
      <Eyebrow>Seventh-day Adventist music &amp; messages</Eyebrow>
      <h1 className="mt-5 max-w-4xl text-balance text-5xl font-extrabold leading-[1.02] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(11,9,24,0.9)] sm:text-6xl md:text-7xl">
        Every hymn, choir and sermon, on one wave.
      </h1>
      <p className="mt-6 max-w-2xl text-pretty text-lg text-aw-text/85 drop-shadow-[0_2px_16px_rgba(11,9,24,0.9)] md:text-xl">
        AdventWave brings recordings from Seventh-day Adventist churches to your browser, your computer and your
        phone — with one account.
      </p>
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <a
          href={appUrl('/')}
          className="inline-flex items-center gap-2 rounded-full bg-aw-primary px-7 py-3.5 text-base font-bold text-white shadow-xl shadow-aw-primary/40 transition hover:bg-aw-primary-hover"
        >
          <Headphones className="size-5" aria-hidden />
          Listen in your browser
        </a>
        <Link
          to="/download"
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-7 py-3.5 text-base font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15"
        >
          <MonitorDown className="size-5" aria-hidden />
          Get the desktop app
        </Link>
      </div>
      <p className="mt-6 min-h-5 text-sm text-aw-muted" aria-live="polite">
        {t &&
          `${formatCount(t.songs)} songs · ${formatCount(t.sermons)} sermons · ${formatCount(t.podcasts)} podcasts from ${formatCount(t.churches)} ${t.churches === 1 ? 'church' : 'churches'}`}
      </p>
      <p aria-hidden className="absolute bottom-8 text-[11px] uppercase tracking-[0.3em] text-white/40">
        scroll ↓
      </p>
    </div>
  )
}

function Numbers({ site }) {
  if (site === null) return null
  const t = site?.totals
  const stats = [
    { icon: Music2, label: 'Songs and hymns', value: t?.songs },
    { icon: BookOpenText, label: 'Sermons', value: t?.sermons },
    { icon: Mic2, label: 'Podcasts', value: t?.podcasts },
    { icon: Timer, label: 'Hours to listen to', value: t?.hours },
    { icon: Users, label: 'Choirs, preachers and hosts', value: t?.artists },
    { icon: Church, label: 'Churches sharing', value: t?.churches },
  ]
  return (
    <Section aria-labelledby="numbers" className="py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>The catalogue today</Eyebrow>
        <h2 id="numbers" className="mt-4 text-balance text-3xl font-bold tracking-tight text-white md:text-5xl">
          Recorded in sanctuaries, shared with the whole church.
        </h2>
      </div>
      <dl className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-3xl bg-aw-ink/80 p-6 ring-1 ring-white/10">
            <Icon className="size-5 text-aw-violet" aria-hidden />
            <dd className="mt-4 text-4xl font-extrabold tracking-tight text-white tabular-nums md:text-5xl">
              {value === undefined ? <span className="inline-block h-10 w-16 animate-pulse rounded-lg bg-white/10" /> : formatCount(value)}
            </dd>
            <dt className="mt-1 text-sm text-aw-muted">{label}</dt>
          </div>
        ))}
      </dl>
    </Section>
  )
}

function itemHref(item) {
  return item.artistId ? appUrl(`/artist/${item.artistId}`) : appUrl('/')
}

function Cover({ src, className = '' }) {
  return (
    <div className={`overflow-hidden bg-gradient-to-br from-aw-primary/40 to-aw-gold/20 ${className}`}>
      {src && <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />}
    </div>
  )
}

function Rail({ title, action, children }) {
  return (
    <div className="mt-14 first:mt-0">
      <div className="flex items-end justify-between gap-4">
        <h3 className="text-xl font-bold text-white md:text-2xl">{title}</h3>
        {action}
      </div>
      <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">{children}</div>
    </div>
  )
}

function SeeAll({ href }) {
  return (
    <a href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-aw-violet hover:text-white">
      See all
      <ArrowRight className="size-4" aria-hidden />
    </a>
  )
}

function Listen({ site }) {
  if (site === null) {
    return (
      <Section id="listen" className="py-24">
        <div className="rounded-3xl bg-aw-ink/80 p-10 text-center ring-1 ring-white/10">
          <h2 className="text-3xl font-bold text-white">Hear what churches are sharing</h2>
          <p className="mx-auto mt-3 max-w-lg text-aw-muted">Open AdventWave to browse the full catalogue.</p>
          <a href={appUrl('/')} className="mt-6 inline-flex items-center gap-2 rounded-full bg-aw-primary px-6 py-3 font-bold text-white hover:bg-aw-primary-hover">
            Open AdventWave
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </Section>
    )
  }
  const loading = site === undefined
  const placeholders = Array.from({ length: 6 }, (_, i) => i)

  return (
    <Section id="listen" aria-labelledby="listen-title" className="py-24 md:py-32">
      <div className="max-w-2xl">
        <Eyebrow>On AdventWave this week</Eyebrow>
        <h2 id="listen-title" className="mt-4 text-balance text-3xl font-bold tracking-tight text-white md:text-5xl">
          What the church is listening to.
        </h2>
        <p className="mt-4 text-aw-muted">
          Live from the catalogue: the most played recordings of the last seven days, sermons to come back to, and
          playlists put together for the Sabbath.
        </p>
      </div>

      <div className="mt-14 rounded-[2rem] bg-aw-ink/80 p-5 ring-1 ring-white/10 sm:p-8">
        <Rail title="Trending now" action={<SeeAll href={appUrl('/browse')} />}>
          <ol className="grid w-max auto-cols-[10.5rem] grid-flow-col gap-4 sm:w-auto sm:grid-flow-row sm:grid-cols-4 sm:auto-cols-auto">
            {loading
              ? placeholders.slice(0, 4).map((i) => <li key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />)
              : site.trending.map((item, i) => (
                  <li key={item.id}>
                    <a href={itemHref(item)} className="group block">
                      <div className="relative">
                        <Cover src={item.cover} className="aspect-square rounded-2xl ring-1 ring-white/10 transition group-hover:ring-aw-violet/60" />
                        <span className="absolute left-2 top-2 rounded-full bg-aw-ink/80 px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                          {i + 1}
                        </span>
                      </div>
                      <p className="mt-3 truncate font-semibold text-white">{item.title}</p>
                      <p className="truncate text-sm text-aw-muted">{item.artist}</p>
                    </a>
                  </li>
                ))}
          </ol>
        </Rail>

        <Rail title="Sermons" action={<SeeAll href={appUrl('/sermons')} />}>
          <ul className="grid w-max auto-cols-[17rem] grid-flow-col gap-3 sm:w-auto sm:grid-flow-row sm:grid-cols-2 sm:auto-cols-auto lg:grid-cols-3">
            {loading
              ? placeholders.slice(0, 3).map((i) => <li key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />)
              : site.sermons.map((item) => (
                  <li key={item.id}>
                    <a href={itemHref(item)} className="flex items-center gap-4 rounded-2xl p-2 transition hover:bg-white/5">
                      <Cover src={item.cover} className="size-16 shrink-0 rounded-xl" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-white">{item.title}</span>
                        <span className="block truncate text-sm text-aw-muted">
                          {item.artist} · {formatDuration(item.durationMs)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
          </ul>
        </Rail>

        {(loading || site.playlists.length > 0) && (
          <Rail title="For the Sabbath">
            <ul className="grid w-max auto-cols-[15rem] grid-flow-col gap-4 sm:w-auto sm:grid-flow-row sm:grid-cols-2 sm:auto-cols-auto lg:grid-cols-3">
              {loading
                ? placeholders.slice(0, 3).map((i) => <li key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />)
                : site.playlists.map((playlist) => (
                    <li key={playlist.id}>
                      <a
                        href={appUrl(`/playlist/${playlist.id}`)}
                        className="flex h-full gap-4 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10 transition hover:ring-aw-violet/50"
                      >
                        <Cover src={playlist.cover} className="size-20 shrink-0 rounded-xl" />
                        <span className="min-w-0 py-1">
                          <span className="block truncate font-semibold text-white">{playlist.title}</span>
                          {playlist.description && <span className="mt-0.5 line-clamp-2 block text-sm text-aw-muted">{playlist.description}</span>}
                          <span className="mt-1 block text-xs font-medium text-aw-violet">
                            {playlist.items} {playlist.items === 1 ? 'recording' : 'recordings'}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
            </ul>
          </Rail>
        )}

        {!loading && site.categories.length > 0 && (
          <Rail title="Browse by mood and ministry">
            <ul className="grid w-max auto-cols-[9rem] grid-flow-col gap-3 sm:w-auto sm:grid-flow-row sm:grid-cols-3 sm:auto-cols-auto lg:grid-cols-6">
              {site.categories.map((category) => (
                <li key={category.id}>
                  <a
                    href={appUrl(`/discover?cat=${encodeURIComponent(category.id)}`)}
                    className="group relative block aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-white/10"
                  >
                    <Cover src={category.cover} className="absolute inset-0 transition duration-500 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-aw-ink via-aw-ink/40 to-aw-primary/10" />
                    <span className="absolute bottom-3 left-3 font-bold text-white">{category.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Rail>
        )}
      </div>
    </Section>
  )
}

const FEATURES = [
  {
    icon: ListMusic,
    title: 'Sing along',
    body: 'Hymn lyrics on screen, following the music line by line where the words are synced.',
  },
  {
    icon: BookOpenText,
    title: 'Sermons in chapters',
    body: 'Jump straight to the reading, the appeal or the part you want to hear again.',
  },
  {
    icon: Timer,
    title: 'Pick up where you stopped',
    body: 'Sermons and podcasts remember your place — start on your phone, finish on your computer.',
  },
  {
    icon: AudioLines,
    title: 'Worship without gaps',
    body: 'Songs crossfade into each other, and autoplay keeps the music going after a playlist ends.',
  },
  {
    icon: Headphones,
    title: 'Even volume',
    body: 'Every recording is levelled to the same loudness, so a quiet choir and a loud praise team sit side by side.',
  },
  {
    icon: Users,
    title: 'Listen with friends',
    body: 'Follow friends and see what they are playing — or start a private session and share nothing.',
  },
]

function Features() {
  return (
    <Section id="features" aria-labelledby="features-title" className="py-24 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>Made for how the church listens</Eyebrow>
        <h2 id="features-title" className="mt-4 text-balance text-3xl font-bold tracking-tight text-white md:text-5xl">
          From Sabbath morning to midweek prayer.
        </h2>
      </div>
      <ul className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="rounded-3xl bg-aw-ink/80 p-6 ring-1 ring-white/10">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-aw-primary/15 text-aw-violet">
              <Icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-aw-muted">{body}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Churches({ site }) {
  const churches = site?.totals?.churches
  return (
    <Section id="churches" aria-labelledby="churches-title" className="py-24 md:py-32">
      <div className="grid gap-10 rounded-[2rem] bg-gradient-to-br from-aw-primary/25 via-aw-ink/80 to-aw-gold/15 p-8 ring-1 ring-white/10 md:grid-cols-2 md:p-14">
        <div>
          <Eyebrow>For churches and choirs</Eyebrow>
          <h2 id="churches-title" className="mt-4 text-balance text-3xl font-bold tracking-tight text-white md:text-4xl">
            Shared with consent. Counted fairly.
          </h2>
          <p className="mt-5 text-aw-muted">
            {churches ? `${formatCount(churches)} ${churches === 1 ? 'church shares' : 'churches share'} recordings on AdventWave today. ` : ''}
            Every one of them chose to: a recording is published only under a licence its church has granted, and it
            comes down when that licence lapses.
          </p>
        </div>
        <ul className="space-y-5">
          <li className="flex gap-4">
            <HandHeart className="mt-0.5 size-6 shrink-0 text-aw-gold" aria-hidden />
            <p className="text-aw-text/90">
              <strong className="text-white">Nothing goes live without a licence.</strong> The database refuses to
              publish a recording whose church has not said yes.
            </p>
          </li>
          <li className="flex gap-4">
            <AudioLines className="mt-0.5 size-6 shrink-0 text-aw-gold" aria-hidden />
            <p className="text-aw-text/90">
              <strong className="text-white">Plays are counted honestly.</strong> A play counts after 30 seconds, or
              half of a shorter recording — and those are the numbers reported back to churches.
            </p>
          </li>
          <li className="flex gap-4">
            <Mic2 className="mt-0.5 size-6 shrink-0 text-aw-gold" aria-hidden />
            <p className="text-aw-text/90">
              <strong className="text-white">Your masters stay yours.</strong> The original recording is kept as you sent
              it; listeners hear a copy made for streaming.
            </p>
          </li>
        </ul>
      </div>
    </Section>
  )
}

function Everywhere() {
  const release = useRelease()
  const platforms = [
    {
      icon: Globe,
      title: 'In the browser',
      body: 'Nothing to install. Sign in and listen on any computer.',
      action: (
        <a href={appUrl('/')} className="font-semibold text-aw-violet hover:text-white">
          Open AdventWave →
        </a>
      ),
    },
    {
      icon: MonitorDown,
      title: 'Windows, macOS and Linux',
      body: 'Its own window, the system tray, your keyboard’s media keys, and updates by itself.',
      action: (
        <Link to="/download" className="font-semibold text-aw-violet hover:text-white">
          Download{release?.version ? ` version ${release.version}` : ''} →
        </Link>
      ),
    },
    {
      icon: Smartphone,
      title: 'Android',
      body: 'The phone app is on its way to Google Play — the same account and library come with you.',
      action: <span className="font-semibold text-aw-gold">Coming soon</span>,
    },
  ]
  return (
    <Section aria-labelledby="everywhere-title" className="py-24 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>One account, everywhere</Eyebrow>
        <h2 id="everywhere-title" className="mt-4 text-balance text-3xl font-bold tracking-tight text-white md:text-5xl">
          Your queue, likes and sermon progress follow you.
        </h2>
      </div>
      <ul className="mt-14 grid gap-3 md:grid-cols-3">
        {platforms.map(({ icon: Icon, title, body, action }) => (
          <li key={title} className="flex flex-col rounded-3xl bg-aw-ink/80 p-6 ring-1 ring-white/10">
            <Icon className="size-6 text-aw-violet" aria-hidden />
            <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-aw-muted">{body}</p>
            <p className="mt-5 text-sm">{action}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Closing() {
  return (
    <Section className="pb-32 pt-16 text-center">
      <h2 className="mx-auto max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_30px_rgba(11,9,24,0.9)] md:text-6xl">
        Let the music carry you into the Sabbath.
      </h2>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={appUrl('/')}
          className="inline-flex items-center gap-2 rounded-full bg-aw-primary px-7 py-3.5 font-bold text-white shadow-xl shadow-aw-primary/40 hover:bg-aw-primary-hover"
        >
          <Headphones className="size-5" aria-hidden />
          Start listening
        </a>
        <Link
          to="/download"
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-7 py-3.5 font-bold text-white ring-1 ring-white/20 hover:bg-white/15"
        >
          <Download className="size-5" aria-hidden />
          Download the app
        </Link>
      </div>
    </Section>
  )
}
