import { useEffect, useState } from 'react'
import { useToastStore } from '../store/useToastStore'
import { useUiStore } from '../store/useUiStore'

function use2xlUp() {
  const [yes, setYes] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1536px)')
    const sync = () => setYes(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return yes
}

export function ToastHost() {
  const message = useToastStore((s) => s.message)
  const privateSession = useUiStore((s) => s.privateSession)
  const friendCollapsed = useUiStore((s) => s.friendActivityCollapsed)
  const wide = use2xlUp()
  if (!message) return null
  const reserveFriend = wide && !privateSession && !friendCollapsed
  return (
    <div
      role="status"
      className={`pointer-events-none fixed bottom-[calc(88px+env(safe-area-inset-bottom)+12px)] z-[55] flex justify-center px-4 md:left-[var(--aw-sidebar-w)] ${
        reserveFriend ? 'left-0 right-72' : 'left-0 right-0'
      }`}
    >
      <div className="max-w-[min(100%,20rem)] rounded-full bg-[var(--aw-text)] px-5 py-2.5 text-center text-sm font-medium text-[var(--aw-bg)] shadow-lg">
        {message}
      </div>
    </div>
  )
}
