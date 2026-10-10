import { useCallback, useState } from 'react'
import { readDuration } from '../lib/duration'
import { formatDurationMs, parseDuration } from '../lib/format'
import { isAllowedMaster, isLossyMaster, MASTER_EXTENSIONS } from '../lib/media'

/**
 * The master the admin picked, what the browser can tell about it, and the declared duration
 * (read from the file's metadata, or typed when the browser cannot decode it).
 */
export function useMasterFile({ detectDuration = true } = {}) {
  const [state, setState] = useState({ file: null, detecting: false, detectedMs: null, typed: null })

  const pick = useCallback(
    (file) => {
      setState({ file, detecting: detectDuration, detectedMs: null, typed: null })
      if (!detectDuration) return
      readDuration(file).then((ms) => {
        setState((s) => (s.file === file ? { ...s, detecting: false, detectedMs: ms } : s))
      })
    },
    [detectDuration],
  )

  const setDurationText = useCallback((typed) => setState((s) => ({ ...s, typed })), [])

  const { file, detecting, detectedMs, typed } = state
  const durationMs = typed != null ? parseDuration(typed) : detectedMs
  const durationText = typed ?? (detectedMs ? formatDurationMs(detectedMs) : '')
  const allowed = file ? isAllowedMaster(file.name) : true

  return {
    file,
    pick,
    detecting,
    detectedMs,
    durationMs,
    durationText,
    setDurationText,
    allowed,
    lossy: file ? isLossyMaster(file.name) : false,
    extensionError: allowed
      ? null
      : `This file type is not accepted. Use one of: ${MASTER_EXTENSIONS.join(', ')}.`,
  }
}
