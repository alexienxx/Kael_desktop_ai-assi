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

// ── Public fetch functions ────────────────────────────────────────────────────

export async function fetchIdentity(opts?: TransportOptions): Promise<IdentityData> {
  return fetchDiagnostic<IdentityData>(DIAGNOSTIC_ENDPOINTS.IDENTITY, opts)
}

export async function fetchDrift(opts?: TransportOptions): Promise<DriftData> {
  return fetchDiagnostic<DriftData>(DIAGNOSTIC_ENDPOINTS.DRIFT, opts)
}

export async function fetchMemory(opts?: TransportOptions): Promise<MemoryData> {
  return fetchDiagnostic<MemoryData>(DIAGNOSTIC_ENDPOINTS.MEMORY, opts)
}

export async function fetchRuntime(opts?: TransportOptions): Promise<RuntimeData> {
  return fetchDiagnostic<RuntimeData>(DIAGNOSTIC_ENDPOINTS.RUNTIME, opts)
}

export async function fetchAutonomy(opts?: TransportOptions): Promise<AutonomyEvent[]> {
  return fetchDiagnostic<AutonomyEvent[]>(DIAGNOSTIC_ENDPOINTS.AUTONOMY, opts)
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
