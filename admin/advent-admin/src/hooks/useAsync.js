import { useCallback, useEffect, useState } from 'react'

/**
 * Runs `load(signal)` whenever `load` changes, and again on `reload()`. Pass a function made
 * with useCallback; its dependencies are what the request depends on.
 *
 * Loading is derived rather than set: a result belongs to the `load` that produced it, so a
 * new id shows nothing until its own answer arrives, while a reload of the same thing keeps
 * the old data on screen (no flicker while polling).
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} load
 */
export function useAsync(load) {
  const [nonce, setNonce] = useState(0)
  const [result, setResult] = useState({
    load: null,
    nonce: -1,
    data: undefined,
    error: null,
    version: 0,
  })

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return
        setResult((r) => ({ load, nonce, data, error: null, version: r.version + 1 }))
      },
      (error) => {
        if (controller.signal.aborted) return
        setResult((r) => ({
          load,
          nonce,
          data: r.load === load ? r.data : undefined,
          error,
          version: r.version + 1,
        }))
      },
    )
    return () => controller.abort()
  }, [load, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  /** Replaces the data with what an action returned, without another round trip. */
  const mutate = useCallback((next) => {
    setResult((r) => ({
      ...r,
      data: typeof next === 'function' ? next(r.data) : next,
      error: null,
      version: r.version + 1,
    }))
  }, [])

  const current = result.load === load
  return {
    /** @type {T | undefined} */
    data: current ? result.data : undefined,
    error: current ? result.error : null,
    /** Nothing for this `load` has arrived yet. */
    loading: !current,
    /** A reload is in flight; `data` is the previous answer. */
    refreshing: current && result.nonce !== nonce,
    /** Bumps on every settled request or mutate; an effect can key polling off it. */
    version: result.version,
    reload,
    mutate,
  }
}
