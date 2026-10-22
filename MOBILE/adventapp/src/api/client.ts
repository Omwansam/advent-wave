import { API_BASE_URL } from '@/lib/config';

/** Shape of the gateway's error body — see ApiExceptionHandler on the server. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/**
 * The bearer token, held here rather than read from the auth store so this module does not
 * import the store, which imports it. The store owns it and calls `setAuthToken`.
 */
let token: string | null = null;
const unauthorizedListeners = new Set<() => void>();

export function setAuthToken(next: string | null): void {
  token = next || null;
}

export function getAuthToken(): string | null {
  return token;
}

/** A 401 from any request: the server rejected the token, so the session is over. */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  /** False for sign-in and sign-up, which must not send a stale token. */
  auth?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? `${url}?${parts.join('&')}` : url;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, signal, auth = true } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null as T;

  // Expired, revoked, or minted by a different secret: tell the auth store so it ends the
  // session, rather than letting every screen retry. Sign-in's own 401 is a wrong password.
  if (response.status === 401 && auth && token) {
    unauthorizedListeners.forEach((listener) => listener());
  }

  const text = await response.text();
  const payload = text ? safeParse(text) : null;

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : null) ?? `${method} ${path} failed with ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, { ...options, body }),
  del: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};
