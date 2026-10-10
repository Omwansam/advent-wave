import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const VARIANTS = {
  primary:
    'bg-[var(--aw-primary)] text-white hover:bg-[var(--aw-primary-hover)] shadow-sm shadow-[var(--aw-primary)]/20',
  secondary:
    'border border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-text)] hover:bg-[var(--aw-surface-elevated)]',
  danger:
    'border border-[var(--aw-danger)]/40 bg-[var(--aw-danger-soft)] text-[var(--aw-danger)] hover:border-[var(--aw-danger)]',
  ghost: 'text-[var(--aw-muted)] hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)]',
}

const SIZES = {
  sm: 'h-7 gap-1.5 rounded-lg px-2.5 text-xs',
  md: 'h-9 gap-2 rounded-xl px-3.5 text-sm',
}

function classes(variant, size, className) {
  return `inline-flex shrink-0 items-center justify-center font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
    VARIANTS[variant]
  } ${SIZES[size]} ${className}`
}

/**
 * @param {{ variant?: keyof VARIANTS, size?: 'sm' | 'md', pending?: boolean,
 *           icon?: import('react').ComponentType<{ className?: string }> } &
 *          import('react').ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  pending = false,
  icon: Icon,
  className = '',
  disabled,
  children,
  type = 'button',
  ...rest
}) {
  const iconClass = size === 'sm' ? 'size-3.5' : 'size-4'
  return (
    <button
      type={type}
      className={classes(variant, size, className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {pending ? (
        <Loader2 className={`${iconClass} animate-spin`} aria-hidden />
      ) : Icon ? (
        <Icon className={iconClass} aria-hidden />
      ) : null}
      {children}
    </button>
  )
}

export function ButtonLink({ variant = 'secondary', size = 'md', icon: Icon, className = '', children, ...rest }) {
  const iconClass = size === 'sm' ? 'size-3.5' : 'size-4'
  return (
    <Link className={classes(variant, size, className)} {...rest}>
      {Icon ? <Icon className={iconClass} aria-hidden /> : null}
      {children}
    </Link>
  )
}
