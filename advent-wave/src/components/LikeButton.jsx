import { Heart } from 'lucide-react'

const iconClass = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-7',
}

/**
 * Spotify-style like control: filled gold heart, pop animation on press.
 */
export function LikeButton({
  liked,
  onToggle,
  disabled = false,
  size = 'md',
  stopPropagation = true,
  className = '',
}) {
  const ic = iconClass[size] || iconClass.md

  return (
    <button
      type="button"
      disabled={Boolean(disabled)}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation()
        onToggle()
      }}
      aria-label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
      aria-pressed={liked}
      className={`aw-like-btn inline-flex shrink-0 items-center justify-center rounded-full text-[var(--aw-muted)] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10 ${
        liked ? 'text-[var(--aw-gold)]' : ''
      } ${className}`}
    >
      <Heart
        className={`${ic} aw-like-icon transition-[transform,filter] duration-200 ease-out ${
          liked ? 'fill-current text-[var(--aw-gold)] drop-shadow-[0_0_6px_rgba(201,162,39,0.45)]' : ''
        }`}
      />
    </button>
  )
}
