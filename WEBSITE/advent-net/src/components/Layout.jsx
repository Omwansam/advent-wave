import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowUpRight, Menu, Sparkles, X } from 'lucide-react'
import { appUrl } from '../lib/adventwave'
import { FlowWaveBackground } from './FlowWaveBackground'

const NAV = [
  { label: 'Listen', to: '/#listen' },
  { label: 'Features', to: '/#features' },
  { label: 'For churches', to: '/#churches' },
  { label: 'Download', to: '/download' },
]

/** The mark the web app uses: sparkles on a violet tile. */
export function Logo({ className = '' }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-aw-primary to-aw-violet text-white shadow-lg shadow-aw-primary/30">
        <Sparkles className="size-[18px]" aria-hidden />
      </span>
      <span className="text-lg font-bold tracking-tight text-white">AdventWave</span>
    </span>
  )
}

/** `className` carries the display (`hidden sm:inline-flex`, `flex`): two display utilities on one element fight. */
function OpenAppLink({ className }) {
  return (
    <a
      href={appUrl('/')}
      className={`items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-aw-ink transition hover:bg-aw-lavender ${className}`}
    >
      Open AdventWave
      <ArrowUpRight className="size-4" aria-hidden />
    </a>
  )
}

function SiteHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  // Close the phone menu whenever the visitor goes somewhere.
  const [seen, setSeen] = useState(location)
  if (seen !== location) {
    setSeen(location)
    setOpen(false)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-30 px-4 pt-4">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl bg-aw-ink/55 px-4 py-2.5 ring-1 ring-white/10 backdrop-blur-md"
      >
        <Link to="/" title="AdventWave home">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-aw-muted transition hover:text-white"
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <OpenAppLink className="hidden sm:inline-flex" />
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl text-white ring-1 ring-white/15 md:hidden"
            aria-expanded={open}
            aria-controls="phone-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </nav>
      {open && (
        <div id="phone-menu" className="mx-auto mt-2 max-w-6xl rounded-2xl bg-aw-ink/90 p-3 ring-1 ring-white/10 backdrop-blur-md md:hidden">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="block rounded-xl px-3 py-3 font-medium text-white hover:bg-white/5">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <OpenAppLink className="mt-2 flex w-full justify-center py-3" />
        </div>
      )}
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="relative border-t border-white/10 bg-aw-ink/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm text-aw-muted">
            Hymns, choirs, sermons and podcasts from Seventh-day Adventist churches — in the browser, on your computer
            and on your phone.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <h2 className="font-semibold text-white">Listen</h2>
            <ul className="mt-3 space-y-2 text-aw-muted">
              <li>
                <a className="hover:text-white" href={appUrl('/')}>
                  Open in the browser
                </a>
              </li>
              <li>
                <a className="hover:text-white" href={appUrl('/sermons')}>
                  Sermons
                </a>
              </li>
              <li>
                <a className="hover:text-white" href={appUrl('/podcasts')}>
                  Podcasts
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-white">Get the app</h2>
            <ul className="mt-3 space-y-2 text-aw-muted">
              <li>
                <Link className="hover:text-white" to="/download">
                  Windows, macOS and Linux
                </Link>
              </li>
              <li>Android — coming to Google Play</li>
            </ul>
          </div>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-10 text-xs text-aw-muted/70 sm:px-6">© {new Date().getFullYear()} AdventWave</p>
    </footer>
  )
}

/** Hash links ("/#features") scroll to their section; a new page starts at the top. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])
  return null
}

export function Layout() {
  return (
    <>
      <FlowWaveBackground />
      <ScrollManager />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-aw-ink">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  )
}
