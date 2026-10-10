import { useCallback, useState } from 'react'

/**
 * One server action and its outcome, so a refusal can be shown next to the button that
 * caused it, in the server's words. `run` never throws: it resolves true on success and
 * false on failure, with the error in `error`.
 */
export function useAction() {
  const [state, setState] = useState({ pending: false, error: null })

  const run = useCallback(async (fn) => {
    setState({ pending: true, error: null })
    try {
      await fn()
      setState({ pending: false, error: null })
      return true
    } catch (error) {
      setState({ pending: false, error })
      return false
    }
  }, [])

  const clear = useCallback(() => setState((s) => ({ ...s, error: null })), [])

  return { ...state, run, clear }
}
