import { useEffect, useRef, useState } from 'react'
import { SectionSkeleton } from './PageSkeleton'

/**
 * Renders children only after the block enters (or nears) the viewport.
 * Keeps initial paint light and matches “lazy sections” on long feeds.
 */
export function LazySection({
  children,
  minHeight = '12rem',
  rootMargin = '160px 0px 80px 0px',
}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true)
      },
      { root: null, rootMargin, threshold: 0.01 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible ? children : <SectionSkeleton />}
    </div>
  )
}
