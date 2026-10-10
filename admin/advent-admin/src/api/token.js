/**
 * The bearer token, held outside React so `client.js` can read it without importing the
 * auth store — which imports the client. The store is the owner: it calls `setAuthToken`
 * on sign-in, on sign-out, and when zustand rehydrates it from localStorage.
 *
 * Copied from advent-wave/src/api/token.js; the apps do not import across each other.
 */

let token = null

/** @type {Set<() => void>} */
const unauthorizedListeners = new Set()

export function setAuthToken(next) {
  token = next || null
}

export function getAuthToken() {
  return token
}

/**
 * Registers a callback for a 401 from any request — the server rejected the token, so the
 * session is over regardless of what the client thinks. Returns an unsubscribe function.
 */
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

export function notifyUnauthorized() {
  unauthorizedListeners.forEach((listener) => listener())
}
