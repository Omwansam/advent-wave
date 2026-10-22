import { useEffect, useRef } from 'react'

/**
 * The Flow Wave scene behind every page, fixed to the window. Three.js loads in its own chunk
 * after the page has drawn, and the scene puts a canvas of its own in here. Without WebGL the
 * gradient underneath is what shows; with it, the scene paints over the gradient from its first
 * frame.
 */
export function FlowWaveBackground() {
  const host = useRef(null)

  useEffect(() => {
    let scene = null
    let unmounted = false
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    import('../scene/flowWave.js')
      .then(({ createFlowWave }) => {
        if (!unmounted) scene = createFlowWave(host.current, { reducedMotion })
      })
      .catch((error) => console.warn('Flow Wave could not start (no WebGL?); showing the plain background.', error))
    return () => {
      unmounted = true
      scene?.dispose()
    }
  }, [])

  return (
    <div ref={host} aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-aw-ink">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_70%,rgba(109,93,246,0.28),transparent_70%),radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(201,162,39,0.12),transparent_70%)]" />
    </div>
  )
}
