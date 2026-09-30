/**
 * Backend Transport
 *
 * Low-level fetch wrapper shared by all backend-facing services:
 * - backendService  (chat / conversation)
 * - controlCenterService (diagnostics)
 * - mediaService (media download)
 *
 * Responsibilities:
 * - Timeout enforcement via AbortController
 * - Authorization header injection
 * - Normalized TransportError classification
 * - No business logic – purely transport concerns
 */

import { backendConfigStore } from './backendConfigStore'

// ── Error kinds ───────────────────────────────────────────────────────────────

export type TransportErrorKind =
  | 'timeout'
  | 'auth_failed'
  | 'not_found'
  | 'server_error'
  | 'network'
  | 'unknown'

export class TransportError extends Error {
  readonly kind: TransportErrorKind
  readonly status?: number

  constructor(message: string, kind: TransportErrorKind, status?: number) {
    super(message)
    this.name = 'TransportError'
    this.kind = kind
    this.status = status
  }
}

/**
 * Classify an HTTP status code into a TransportErrorKind.
 */
export function classifyStatus(status: number): TransportErrorKind {
  if (status === 401 || status === 403) return 'auth_failed'
  if (status === 404) return 'not_found'
  if (status >= 500) return 'server_error'
  return 'unknown'
}

// ── Core fetch ────────────────────────────────────────────────────────────────

export interface TransportOptions extends Omit<RequestInit, 'signal'> {
  /** Override the base URL from backendConfigStore. */
  baseUrl?: string
  /** Override the API key from backendConfigStore. */
  apiKey?: string
  /** Timeout in ms; falls back to backendConfigStore.getTimeout(). */
  timeout?: number
  /** Optional caller cancellation retained for a streamed response body. */
  signal?: AbortSignal
}

/**
 * Perform a fetch request using the shared backend configuration.
 *
 * @param path   Path relative to baseUrl, e.g. `/health` or `/chat`
 * @param opts   Optional overrides for baseUrl, apiKey, timeout, or any RequestInit field
 * @returns      The raw Response on success (2xx)
 * @throws       TransportError on timeout, auth failure, not-found, server error, or network failure
 */
export async function transportFetch(
  path: string,
  opts: TransportOptions = {}
): Promise<Response> {
  const {
    baseUrl = backendConfigStore.getBaseUrl() ?? '',
    apiKey = backendConfigStore.getApiKey(),
    timeout = backendConfigStore.getTimeout(),
    signal,
    ...fetchInit
  } = opts

  if (!baseUrl) {
    throw new TransportError('Backend base URL is not configured', 'unknown')
  }

  const controller = new AbortController()
  if (signal?.aborted) controller.abort()
  else signal?.addEventListener('abort', () => controller.abort(), { once: true })
  const timerId = setTimeout(() => controller.abort(), timeout)

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const url = `${normalizedBase}${path}`

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchInit.headers as Record<string, string> | undefined ?? {}),
  }
  if (apiKey) {
    baseHeaders['Authorization'] = `Bearer ${apiKey}`
  }
  const headers: HeadersInit = baseHeaders

  try {
    const response = await fetch(url, {
      ...fetchInit,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timerId)

    if (!response.ok) {
      const kind = classifyStatus(response.status)
      throw new TransportError(
        `HTTP ${response.status} ${response.statusText} — ${url}`,
        kind,
        response.status
      )
    }

    return response
  } catch (err) {
    clearTimeout(timerId)

    if (err instanceof TransportError) throw err

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new TransportError(`Request timed out after ${timeout}ms`, 'timeout')
      }
      if (err.name === 'TypeError') {
        throw new TransportError(`Network error: ${err.message}`, 'network')
      }
    }

    throw new TransportError(
      err instanceof Error ? err.message : 'Unknown transport error',
      'unknown'
    )
  }
}

/**
 * Convenience wrapper that parses the response as JSON.
 */
export async function transportFetchJson<T>(
  path: string,
  opts: TransportOptions = {}
): Promise<T> {
  const response = await transportFetch(path, opts)
  return response.json() as Promise<T>
}
