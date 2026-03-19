/**
 * Control Center Diagnostic Service
 *
 * Fetches Control Center diagnostic data from the Kael backend.
 * Uses backendTransport (shared with the chat service) so that all backend
 * communication goes through the same timeout / auth / error layer.
 * Configuration is read from backendConfigStore – the single canonical config
 * authority – so the Control Center never maintains its own backend state.
 */

import {
  IdentityData,
  DriftData,
  MemoryData,
  RuntimeData,
  AutonomyEvent,
  CognitiveEvent,
} from '@/lib/types'
import { transportFetchJson, TransportOptions } from './backendTransport'

// ── Diagnostic endpoint paths ─────────────────────────────────────────────────
//
// Declared here so that all Control Center route assumptions live in one
// place and can be updated without touching UI components.

const DIAGNOSTIC_ENDPOINTS = {
  IDENTITY: '/debug/identity',
  DRIFT: '/self-audit/drift',
  MEMORY: '/debug/memory',
  RUNTIME: '/debug/runtime',
  AUTONOMY: '/debug/autonomy',
} as const

// ── Shared fetch helper ───────────────────────────────────────────────────────

/**
 * Fetch a diagnostic endpoint.
 * baseUrl and apiKey are read from backendConfigStore via transportFetchJson
 * unless overridden here.
 */
function fetchDiagnostic<T>(path: string, opts?: TransportOptions): Promise<T> {
  return transportFetchJson<T>(path, { method: 'GET', ...opts })
}

// ── Backend → frontend response mappings ──────────────────────────────────────
//
// The Kael backend returns shapes that differ slightly from the UI types.
// These mappers normalise responses so panels always get the expected types.

interface BackendIdentityResponse {
  active_persona?: string
  blend?: Record<string, number>
  identity_alignment?: number
  timestamp?: number
}

interface BackendMemoryResponse {
  long_term_items?: number
  symbolic_motifs?: number | string[]
  timeline_events?: number
  recall_confidence?: number
  timestamp?: number
}

interface BackendAutonomyResponse {
  initiative_score?: number
  last_event?: {
    reason?: string
    action?: string
    confidence?: number
    timestamp?: number
  } | null
  timestamp?: number
}

// ── Public fetch functions ────────────────────────────────────────────────────

export async function fetchIdentity(opts?: TransportOptions): Promise<IdentityData> {
  const raw = await fetchDiagnostic<BackendIdentityResponse>(DIAGNOSTIC_ENDPOINTS.IDENTITY, opts)
  // Backend returns { blend: { baseline, mentor, dominant }, identity_alignment }
  // UI expects { baseline, mentor, dominant, identity_alignment }
  const blend = raw.blend ?? {}
  return {
    baseline: blend.baseline ?? 0,
    mentor: blend.mentor ?? 0,
    dominant: blend.dominant ?? 0,
    identity_alignment: raw.identity_alignment ?? 0,
  }
}

export async function fetchDrift(opts?: TransportOptions): Promise<DriftData> {
  return fetchDiagnostic<DriftData>(DIAGNOSTIC_ENDPOINTS.DRIFT, opts)
}

export async function fetchMemory(opts?: TransportOptions): Promise<MemoryData> {
  const raw = await fetchDiagnostic<BackendMemoryResponse>(DIAGNOSTIC_ENDPOINTS.MEMORY, opts)
  // Backend returns { long_term_items: number, symbolic_motifs: number }
  // UI expects  { long_term_count: number, symbolic_motifs: string[] }
  return {
    long_term_count: raw.long_term_items ?? 0,
    symbolic_motifs: Array.isArray(raw.symbolic_motifs)
      ? raw.symbolic_motifs
      : [],
    timeline_events: raw.timeline_events ?? 0,
    recall_confidence: raw.recall_confidence ?? 0,
  }
}

export async function fetchRuntime(opts?: TransportOptions): Promise<RuntimeData> {
  return fetchDiagnostic<RuntimeData>(DIAGNOSTIC_ENDPOINTS.RUNTIME, opts)
}

export async function fetchAutonomy(opts?: TransportOptions): Promise<AutonomyEvent[]> {
  const raw = await fetchDiagnostic<BackendAutonomyResponse>(DIAGNOSTIC_ENDPOINTS.AUTONOMY, opts)
  // Backend returns { initiative_score, last_event: { reason, action, confidence, timestamp } }
  // UI expects AutonomyEvent[]
  const events: AutonomyEvent[] = []
  if (raw.last_event) {
    events.push({
      id: `${raw.last_event.timestamp ?? Date.now()}-${raw.last_event.reason ?? 'unknown'}`,
      reason: raw.last_event.reason ?? 'unknown',
      action: raw.last_event.action ?? 'none',
      confidence: raw.last_event.confidence ?? 0,
      timestamp: raw.last_event.timestamp ?? Date.now(),
    })
  }
  return events
}

// Fallback mock data used when the backend is unreachable or not configured
export const MOCK_IDENTITY: IdentityData = {
  baseline: 0.65,
  mentor: 0.20,
  dominant: 0.15,
  identity_alignment: 0.84,
}

export const MOCK_DRIFT: DriftData = {
  drift_score: 0.34,
  stability_score: 0.82,
  identity_alignment: 0.71,
  vector: {
    architecture: 0.2,
    emotion: 0.4,
    memory: 0.3,
    calls: 0.1,
    config: 0.25,
  },
}

export const MOCK_MEMORY: MemoryData = {
  long_term_count: 42,
  symbolic_motifs: ['growth', 'connection', 'curiosity', 'resilience'],
  timeline_events: 17,
  recall_confidence: 0.78,
}

export const MOCK_RUNTIME: RuntimeData = {
  services: {
    memory_lifecycle: 'running',
    cognitive_bus: 'active',
    initiative_engine: 'running',
    voice_router: 'active',
  },
  modules_registered: 17,
  uptime: 19382,
}

export const MOCK_AUTONOMY: AutonomyEvent[] = [
  {
    id: '1',
    reason: 'silence_pressure',
    action: 'send_message',
    confidence: 0.61,
    timestamp: Date.now() - 60000,
  },
  {
    id: '2',
    reason: 'curiosity',
    action: 'web_search',
    confidence: 0.74,
    timestamp: Date.now() - 120000,
  },
  {
    id: '3',
    reason: 'low_energy',
    action: 'defer_response',
    confidence: 0.55,
    timestamp: Date.now() - 300000,
  },
]

export const MOCK_COGNITIVE_EVENTS: CognitiveEvent[] = [
  { stage: 'user_input', timestamp: Date.now() - 5000 },
  { stage: 'memory_recall', timestamp: Date.now() - 4000 },
  { stage: 'emotion_update', timestamp: Date.now() - 3000 },
  { stage: 'persona_selected', timestamp: Date.now() - 2000 },
  { stage: 'decision', timestamp: Date.now() - 1000 },
  { stage: 'generation_start', timestamp: Date.now() - 500 },
]
