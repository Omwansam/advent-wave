const DAY_MS = 86400000

/** Whether a licence has expired by date, and how soon it will. Status `expired` is separate. */
export function licenseExpiry(license, now = Date.now()) {
  if (!license?.expiresAt) return { expired: false, soon: false, daysLeft: null }
  const left = new Date(license.expiresAt).getTime() - now
  return {
    expired: left <= 0,
    soon: left > 0 && left < 30 * DAY_MS,
    daysLeft: Math.ceil(left / DAY_MS),
  }
}

/** The licence a publish would pass: granted and not past its expiry. Mirrors the trigger. */
export function isUsableLicense(license, now = Date.now()) {
  return license?.consentStatus === 'granted' && !licenseExpiry(license, now).expired
}
