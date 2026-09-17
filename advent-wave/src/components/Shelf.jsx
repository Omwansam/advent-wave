import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * A titled horizontal rail of cards. The optional eyebrow sits above the title
 * ("Because you listened to" / "Artist name"); `to` turns the title into a link and adds
 * "Show all". Cards carry their own padding, so the section is pulled out by that much to
 * keep artwork aligned with the title.
 */
export function Shelf({ eyebrow, title, to, children, className = '' }) {
  const railRef = useRef(null)
  const trackRef = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  useEffect(() => {
    const rail = railRef.current
    const track = trackRef.current
    if (!rail || !track) return undefined
    const update = () => {
      setAtStart(rail.scrollLeft <= 1)
      setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1)
    }
    update()
    rail.addEventListener('scroll', update, { passive: true })
    // The track's width changes as cards mount; the rail's own box does not.
    const ro = new ResizeObserver(update)
    ro.observe(rail)
    ro.observe(track)
    return () => {
      rail.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  const scrollBy = (dir) => {
    const rail = railRef.current
    if (!rail) return
    rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' })
  }

  const heading = (
    <h2 className="truncate text-2xl font-bold tracking-tight text-[var(--aw-text)]">
      {title}
    </h2>
  )

  const arrowCls =
    'absolute top-[40%] z-10 size-9 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--aw-surface)] text-[var(--aw-text)] opacity-0 shadow-lg ring-1 ring-black/10 transition hover:scale-105 focus-visible:opacity-100 group-hover/shelf:opacity-100 dark:ring-white/10'

  return (
    <section className={`group/shelf -mx-3 ${className}`}>
      <div className="mb-1 flex items-end justify-between gap-4 px-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-medium text-[var(--aw-muted)]">{eyebrow}</p>
          ) : null}
          {to ? (
            <Link to={to} className="block hover:underline">
              {heading}
            </Link>
          ) : (
            heading
          )}
        </div>
        {to ? (
          <Link
            to={to}
            className="shrink-0 pb-1 text-sm font-semibold text-[var(--aw-muted)] transition hover:text-[var(--aw-text)] hover:underline"
          >
            Show all
          </Link>
        ) : null}
      </div>

      <div className="relative">
        <div
          ref={railRef}
          className="aw-rail snap-x snap-proximity overflow-x-auto overscroll-x-contain"
        >
          <div ref={trackRef} className="flex w-max">
            {children}
          </div>
        </div>

        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll back"
          className={`${arrowCls} left-1 ${atStart ? 'hidden' : 'hidden md:flex'}`}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll forward"
          className={`${arrowCls} right-1 ${atEnd ? 'hidden' : 'hidden md:flex'}`}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  )
}
