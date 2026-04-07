/**
 * Local-time greeting for the Home hero (no randomness).
 * @returns {'morning' | 'afternoon' | 'evening'}
 */
export function getGreetingPeriod() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  return 'evening'
}

/** @param {'morning' | 'afternoon' | 'evening'} period */
export function greetingLabel(period) {
  switch (period) {
    case 'morning':
      return 'Good morning'
    case 'afternoon':
      return 'Good afternoon'
    default:
      return 'Good evening'
  }
}
