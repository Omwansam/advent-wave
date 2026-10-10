import { useCallback, useEffect, useRef, useState } from 'react'
import { IngestStepError } from '../lib/ingest'

/**
 * Runs an ingest task and tracks it for IngestProgress: the step in flight, upload progress,
 * and which step failed with what. Navigating away cancels an upload in flight (the draft
 * stays and can be resumed); closing the tab asks first.
 */
export function useIngestRunner() {
  const [state, setState] = useState(null)
  const controllerRef = useRef(null)

  const running = Boolean(state && !state.failed && state.step !== 'done')

  useEffect(() => () => controllerRef.current?.abort(), [])

  useEffect(() => {
    if (!running) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [running])

  /**
   * @param {string} firstStep
   * @param {(ctx: { signal: AbortSignal, onStep: (step: string) => void,
   *   onProgress: (fraction: number, loaded: number, total: number) => void }) => Promise<T>} task
   * @returns {Promise<T | null>} null when a step failed or was cancelled.
   * @template T
   */
  const run = useCallback(async (firstStep, task) => {
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ step: firstStep, failed: false, error: null, fraction: 0, loaded: 0, total: 0 })

    const onStep = (step) => setState((s) => ({ ...s, step }))
    const onProgress = (fraction, loaded, total) => setState((s) => ({ ...s, fraction, loaded, total }))

    try {
      const result = await task({ signal: controller.signal, onStep, onProgress })
      setState((s) => ({ ...s, step: 'done' }))
      return result
    } catch (error) {
      setState((s) => ({
        ...s,
        step: error instanceof IngestStepError ? error.step : s.step,
        failed: true,
        error,
      }))
      return null
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [])

  const cancel = useCallback(() => controllerRef.current?.abort(), [])
  const reset = useCallback(() => setState(null), [])

  return { state, running, run, cancel, reset }
}
