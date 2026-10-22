import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'
import { desktopBridge } from '../utils/desktop'

/**
 * Inside the desktop app: tells its tray what is playing, and takes Play/Pause, Next and Previous
 * from the tray menu. Previous and Next are the player's own handlers — restart past three
 * seconds in, otherwise go back — so the tray, the buttons and the media keys all agree.
 * In a browser this does nothing.
 *
 * @param {{ currentSong: object | null, isPlaying: boolean, onPrev: () => void, onNext: () => void }} p
 */
export function useDesktopBridge({ currentSong, isPlaying, onPrev, onNext }) {
  const handlersRef = useRef({ onPrev, onNext })
  useEffect(() => {
    handlersRef.current = { onPrev, onNext }
  })

  useEffect(() => {
    if (!desktopBridge) return undefined
    return desktopBridge.onCommand((command) => {
      if (command === 'toggle') usePlayerStore.getState().togglePlay()
      else if (command === 'next') handlersRef.current.onNext()
      else if (command === 'previous') handlersRef.current.onPrev()
    })
  }, [])

  const title = currentSong?.title ?? null
  const artist = currentSong?.artist ?? null
  useEffect(() => {
    if (!desktopBridge) return
    desktopBridge.setNowPlaying(title ? { title, artist, playing: isPlaying } : null)
  }, [title, artist, isPlaying])

  // Signing out unmounts the player: the tray must not keep showing the last account's song.
  useEffect(() => () => desktopBridge?.setNowPlaying(null), [])
}
