import { extensionOf } from './media'

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm']

/**
 * The file's duration in milliseconds as the browser reads it, or null when it cannot (AIFF,
 * and FLAC in some browsers, have no decoder here). Only a declared value: the worker measures
 * the real duration and overwrites it.
 *
 * @param {File} file
 * @returns {Promise<number | null>}
 */
export function readDuration(file) {
  return new Promise((resolve) => {
    const isVideo = VIDEO_EXTENSIONS.includes(extensionOf(file.name)) || file.type.startsWith('video/')
    const element = document.createElement(isVideo ? 'video' : 'audio')
    const url = URL.createObjectURL(file)
    let settled = false

    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      element.removeAttribute('src')
      element.load()
      URL.revokeObjectURL(url)
      resolve(value)
    }

    const timer = setTimeout(() => finish(null), 15000)

    element.preload = 'metadata'
    element.muted = true
    element.onloadedmetadata = () => {
      const seconds = element.duration
      finish(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : null)
    }
    element.onerror = () => finish(null)
    element.src = url
  })
}
