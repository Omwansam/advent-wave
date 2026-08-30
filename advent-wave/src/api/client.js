import { getAuthToken, notifyUnauthorized } from './token'

/**
 * Empty in development: vite.config.js proxies /v1 to the gateway, so the browser sees one
 * origin. Production builds set VITE_API_BASE_URL to the gateway's origin.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** Shape of the gateway's error body — see ApiExceptionHandler on the server. */
export class ApiError extends Error {
  constructor(status, message, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isNotFound() {
    return this.status === 404
  }
}

function buildUrl(path, query) {
  const url = `${BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * @param {string} method
 * @param {string} path  Path only, starting with `/v1`.
 * @param {{ body?: unknown, query?: Record<string, unknown>, signal?: AbortSignal,
 *           auth?: boolean }} [options]
 */
export async function request(method, path, options = {}) {
  const { body, query, signal, auth = true } = options

  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = getAuthToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return null

  // 401 means the server rejected the token: expired, or minted by a different secret.
  // Tell the auth store so it can end the session rather than letting every page retry.
  if (response.status === 401) {
    notifyUnauthorized()
  }

  const text = await response.text()
  const payload = text ? safeParse(text) : null

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && payload.message) ||
      `${method} ${path} failed with ${response.status}`
    throw new ApiError(response.status, message, payload)
  }

  return payload
}

function safeParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  put: (path, body, options) => request('PUT', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  del: (path, options) => request('DELETE', path, options),
}
