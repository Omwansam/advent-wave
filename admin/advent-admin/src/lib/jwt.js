/**
 * Reads a JWT's payload without verifying it — only to notice an expired token before using it.
 * The gateway verifies every token and decides every permission from the stored account.
 */
export function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1]
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

export function isExpired(token, now = Date.now()) {
  const payload = decodeJwtPayload(token)
  return !payload || (typeof payload.exp === 'number' && payload.exp * 1000 <= now)
}
