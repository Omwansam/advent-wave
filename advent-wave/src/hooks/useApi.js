import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Minimal data loader: run an async function, track loading/error/data, abort on unmount.
 *
 * Deliberately not a cache. The app has one server and few pages; a query library would be
 * more machinery than the problem needs today. If cross-page caching starts to matter, this
 * is the seam to replace.
 *
 * @param {(signal: AbortSignal) => Promise<T>} loader
 * @param {unknown[]} deps  Re-runs when these change, like useEffect.
 * @param {{ enabled?: boolean }} [options]
 * @returns {{ data: T | null, error: Error | null, loading: boolean,
 *             refetch: () => void, setData: (v: T) => void }}
 * @template T
 */
export function useApi(loader, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [nonce, setNonce] = useState(0)

  // Held in a ref so an inline arrow function does not restart the effect every render.
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    let active = true

    setLoading(true)
    setError(null)

    loaderRef
      .current(controller.signal)
      .then((result) => {
        if (active) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!active || controller.signal.aborted || err.name === 'AbortError') return
        setError(err)
        setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  return { data, error, loading, refetch, setData }
}
