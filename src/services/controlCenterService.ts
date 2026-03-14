import {
  IdentityData,
  DriftData,
  MemoryData,
  RuntimeData,
  AutonomyEvent,
  CognitiveEvent,
} from '@/lib/types'

export interface ControlCenterData {
  identity: IdentityData | null
  drift: DriftData | null
  memory: MemoryData | null
  runtime: RuntimeData | null
  autonomyEvents: AutonomyEvent[]
  cognitiveEvents: CognitiveEvent[]
}

function buildUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/$/, '') + path
}

async function fetchJson<T>(url: string, apiKey?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export async function fetchIdentity(baseUrl: string, apiKey?: string): Promise<IdentityData> {
  return fetchJson<IdentityData>(buildUrl(baseUrl, '/debug/identity'), apiKey)
}

export async function fetchDrift(baseUrl: string, apiKey?: string): Promise<DriftData> {
  return fetchJson<DriftData>(buildUrl(baseUrl, '/self-audit/drift'), apiKey)
}

export async function fetchMemory(baseUrl: string, apiKey?: string): Promise<MemoryData> {
  return fetchJson<MemoryData>(buildUrl(baseUrl, '/debug/memory'), apiKey)
}

export async function fetchRuntime(baseUrl: string, apiKey?: string): Promise<RuntimeData> {
  return fetchJson<RuntimeData>(buildUrl(baseUrl, '/debug/runtime'), apiKey)
}

export async function fetchAutonomy(baseUrl: string, apiKey?: string): Promise<AutonomyEvent[]> {
  return fetchJson<AutonomyEvent[]>(buildUrl(baseUrl, '/debug/autonomy'), apiKey)
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
