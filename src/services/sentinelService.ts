/**
 * Sentinel Service — lightweight client for the Kael Sentinel wake-on-demand
 * server (port 8099).
 *
 * The sentinel is always running on the Kael PC and can launch the main
 * backend (port 8002) via bootstrap_kael.py when requested.
 *
 * This service derives the sentinel URL from the configured backend URL
 * by swapping port 8002 → 8099.
 */

const SENTINEL_PORT = 8099;
const SENTINEL_TIMEOUT = 3_000; // 3 seconds

export interface SentinelStatus {
  backend_alive: boolean;
  bootstrap_running: boolean;
  bootstrap_pid: number | null;
  last_result: string;
  last_start_time: number | null;
}

export interface SentinelStartResult {
  started: boolean;
  reason?: string;
  pid?: number;
}

/**
 * Derive the sentinel URL from a backend base URL.
 * e.g. "http://192.168.178.78:8002" → "http://192.168.178.78:8099"
 *      "http://localhost:8002"       → "http://localhost:8099"
 */
export function deriveSentinelUrl(backendBaseUrl: string): string {
  try {
    const u = new URL(backendBaseUrl);
    u.port = String(SENTINEL_PORT);
    // Remove any trailing path
    u.pathname = '';
    return u.origin;
  } catch {
    // Fallback: simple regex replace
    return backendBaseUrl.replace(/:\d+/, `:${SENTINEL_PORT}`);
  }
}

/**
 * Probe the sentinel at the given URL.
 * Returns true if it responds with { status: "sentinel_alive" }.
 */
export async function probeSentinel(sentinelUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${sentinelUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(SENTINEL_TIMEOUT),
    });
    if (!res.ok) return false;
    const body = await res.json();
    return body?.status === 'sentinel_alive';
  } catch {
    return false;
  }
}

/**
 * Ask the sentinel to start the main backend via bootstrap_kael.py.
 */
export async function requestBootstrap(sentinelUrl: string): Promise<SentinelStartResult> {
  const res = await fetch(`${sentinelUrl}/start`, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  });
  return res.json();
}

/**
 * Get backend status via the sentinel.
 */
export async function getSentinelStatus(sentinelUrl: string): Promise<SentinelStatus> {
  const res = await fetch(`${sentinelUrl}/status`, {
    method: 'GET',
    signal: AbortSignal.timeout(SENTINEL_TIMEOUT),
  });
  return res.json();
}
