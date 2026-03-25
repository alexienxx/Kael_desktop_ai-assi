/**
 * Observatory Service
 *
 * Fetches and composes Observatory data from /debug/* endpoints.
 * Strategy: Hybrid — try /observatory/* first (for future), fall back to /debug/*.
 * Currently all /observatory/* endpoints return 404, so the /debug/* composition
 * path is the active codepath.
 *
 * Data flow:
 * 1. Fetch /debug/cognitive_dashboard (richest single source)
 * 2. Fetch supplementary endpoints in parallel
 * 3. Compose all 10 Observatory section payloads
 *
 * Transport: uses transportFetchJson from backendTransport.ts
 */

import { transportFetchJson, TransportError } from './backendTransport'
import type {
  ObservatoryData,
  ObservatoryResponse,
  ObservatoryMeta,
  CoreOverview,
  WeightsHealth,
  WeightEntry,
  IdentityDrift,
  DecisionPreferences,
  EmotionalState,
  EmotionalAxis,
  MemoryStats,
  PersonaRouting,
  ModulesOverview,
  ModuleHealth,
  RecentEvents,
  RawDebugData,
  RiskLevel,
  Trend,
  Freshness,
} from '@/lib/observatory-types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMeta(source: string, fresh: Freshness = 'live'): ObservatoryMeta {
  return { freshness: fresh, lastUpdate: new Date().toISOString(), source }
}

function wrap<T>(data: T, source: string, fresh: Freshness = 'live'): ObservatoryResponse<T> {
  return { data, meta: makeMeta(source, fresh) }
}

/** Safe fetch — returns null on error instead of throwing. */
async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    return await transportFetchJson<T>(path)
  } catch (err) {
    if (err instanceof TransportError && (err.kind === 'not_found' || err.kind === 'timeout')) {
      return null
    }
    console.warn(`[ObservatoryService] ${path} failed:`, err)
    return null
  }
}

function riskFromNumber(value: number, warningThreshold: number, criticalThreshold: number): RiskLevel {
  if (value >= criticalThreshold) return 'critical'
  if (value >= warningThreshold) return 'attention'
  return 'healthy'
}

function trendFromDelta(current: number, baseline: number): Trend {
  const delta = current - baseline
  if (Math.abs(delta) < 0.02) return 'stable'
  return delta > 0 ? 'rising' : 'falling'
}

// ── Raw backend response types (loose, backend-shaped) ───────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type Dashboard = Record<string, any>
type CognitionData = Record<string, any>
type IdentityRaw = Record<string, any>
type DriftSummary = Record<string, any>
type StatePlane = Record<string, any>
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Composers ────────────────────────────────────────────────────────────────

function composeOverview(dash: Dashboard): ObservatoryResponse<CoreOverview> {
  const modules = dash.modules ?? {}
  const moduleList = Array.isArray(modules.list) ? modules.list : []
  const flags = dash.flags ?? {}
  const heartbeat = dash.heartbeat_age_s ?? dash.heartbeat ?? -1

  const subsystems = moduleList.map((m: any) => ({
    name: m.name ?? m.module ?? 'unknown',
    status: m.status === 'active' ? 'active' as const
      : m.status === 'degraded' ? 'degraded' as const
      : 'inactive' as const,
    detail: m.detail ?? undefined,
  }))

  const degradedCount = subsystems.filter((s: any) => s.status === 'degraded').length
  const risk: RiskLevel = degradedCount > 2 ? 'critical' : degradedCount > 0 ? 'attention' : 'healthy'

  return wrap<CoreOverview>({
    model: dash.model?.env ?? dash.model ?? 'unknown',
    uptime_seconds: dash.uptime_seconds ?? 0,
    heartbeat_age_s: heartbeat,
    adaptive_tick_s: dash.adaptive_tick_s ?? 0,
    modules_total: modules.total ?? moduleList.length,
    modules_active: modules.active ?? 0,
    modules_degraded: modules.degraded ?? 0,
    flags,
    subsystems,
    risk,
  }, '/debug/cognitive_dashboard')
}

function composeWeights(dash: Dashboard, cognition: CognitionData | null): ObservatoryResponse<WeightsHealth> {
  const weights: WeightEntry[] = []
  const categories = new Set<string>()

  // Emotion axes from cognition
  const cog = cognition ?? dash.cognitive ?? {}
  const emotionMap: Record<string, number> = {
    valence: cog.emotion_valence ?? 0,
    arousal: cog.emotion_arousal ?? 0,
    dominance: cog.emotion_dominance ?? 0,
    stability: cog.emotion_stability ?? cog.stability ?? 0,
  }
  for (const [name, value] of Object.entries(emotionMap)) {
    categories.add('emotion')
    weights.push({
      name,
      value,
      category: 'emotion',
      trend: 'stable',
      history: [value],
      impact: `Emotional axis: ${name}`,
    })
  }

  // Drives
  const drives: Record<string, number> = {
    curiosity: cog.drive_curiosity ?? dash.drive_curiosity ?? 0,
    bonding: cog.drive_bonding ?? dash.drive_bonding ?? 0,
    exploration: cog.drive_exploration ?? dash.drive_exploration ?? 0,
    reflection: cog.drive_reflection ?? dash.drive_reflection ?? 0,
  }
  for (const [name, value] of Object.entries(drives)) {
    categories.add('drive')
    weights.push({
      name,
      value,
      category: 'drive',
      trend: 'stable',
      history: [value],
      impact: `Internal drive: ${name}`,
    })
  }

  // Fatigue / attention
  const fatigue = dash.fatigue_data ?? dash.fatigue ?? {}
  if (typeof fatigue === 'object') {
    categories.add('system')
    weights.push({
      name: 'fatigue',
      value: fatigue.fatigue ?? fatigue.level ?? 0,
      category: 'system',
      trend: 'stable',
      history: [fatigue.fatigue ?? 0],
      impact: `Fatigue level (threshold: ${fatigue.threshold ?? 'N/A'})`,
    })
  }

  const attention = cog.attention_level ?? dash.attention_level ?? 0
  categories.add('system')
  weights.push({
    name: 'attention',
    value: attention,
    category: 'system',
    trend: 'stable',
    history: [attention],
    impact: 'Attention level',
  })

  const catArr = Array.from(categories)
  const overallRisk = weights.some(w => w.value > 0.85 || w.value < 0.1) ? 'attention' : 'healthy'

  return wrap<WeightsHealth>({
    total_weights: weights.length,
    categories: catArr,
    weights,
    overall_risk: overallRisk as RiskLevel,
  }, '/debug/cognitive_dashboard + /debug/cognition', cognition ? 'live' : 'computed')
}

function composeIdentity(
  dash: Dashboard,
  identityRaw: IdentityRaw | null,
  driftSummary: DriftSummary | null,
): ObservatoryResponse<IdentityDrift> {
  const dashIdentity = dash.identity ?? {}
  const drift = driftSummary ?? {}
  const id = identityRaw ?? {}

  const driftScore = drift.drift_score ?? drift.total ?? dashIdentity.drift ?? 0
  const zone = drift.zone ?? drift.drift_zone ?? (driftScore > 0.6 ? 'danger' : driftScore > 0.3 ? 'warning' : 'safe')
  const coherence = id.coherence ?? dashIdentity.stable ?? 0.8

  // Traits from identity endpoint
  const rawTraits = id.traits ?? id.personality_traits ?? []
  const traits = Array.isArray(rawTraits) ? rawTraits.map((t: any) => ({
    name: t.name ?? t.trait ?? 'unnamed',
    score: t.score ?? t.value ?? 0,
    trend: 'stable' as Trend,
    baseline: t.baseline ?? t.score ?? 0,
  })) : []

  return wrap<IdentityDrift>({
    drift_score: driftScore,
    drift_zone: zone,
    drift_trend: trendFromDelta(driftScore, 0.2),
    coherence,
    traits,
    emerging_themes: drift.emerging ?? [],
    declining_themes: drift.declining ?? [],
    risk: riskFromNumber(driftScore, 0.3, 0.6),
  }, '/debug/identity + /debug/drift_monitor/summary')
}

function composeDecisions(dash: Dashboard): ObservatoryResponse<DecisionPreferences> {
  const router = dash.action_router ?? {}
  const executor = dash.action_executor ?? {}
  const actionCounts: Record<string, number> = router.action_counts ?? {}
  const recentDecisions = Array.isArray(dash.recent_decisions) ? dash.recent_decisions : []

  const paths = recentDecisions.slice(0, 10).map((d: any, i: number) => ({
    action: d.action ?? d.type ?? `decision_${i}`,
    count: d.count ?? 1,
    last_used: d.timestamp ?? new Date().toISOString(),
    success_rate: d.success_rate ?? 1.0,
  }))

  const total = Object.values(actionCounts).reduce((s, v) => s + (v as number), 0)

  return wrap<DecisionPreferences>({
    total_decisions: total,
    action_distribution: actionCounts,
    recent_paths: paths,
    top_factors: Object.keys(actionCounts).slice(0, 5),
    risk: total === 0 ? 'attention' : 'healthy',
  }, '/debug/cognitive_dashboard')
}

function composeEmotional(dash: Dashboard, cognition: CognitionData | null): ObservatoryResponse<EmotionalState> {
  const cog = cognition ?? dash.cognitive ?? {}

  const axisMap: Record<string, number> = {
    valence: cog.emotion_valence ?? 0,
    arousal: cog.emotion_arousal ?? 0,
    dominance: cog.emotion_dominance ?? 0,
    stability: cog.emotion_stability ?? cog.stability ?? 0,
    tension: cog.tension ?? 0,
    attachment_bond: cog.attachment_bond ?? 0,
    attachment_trust: cog.attachment_trust ?? 0,
  }

  const axes: EmotionalAxis[] = Object.entries(axisMap).map(([name, value]) => ({
    name,
    value,
    range: [0, 1] as [number, number],
    trend: 'stable' as Trend,
    history: [value],
    risk: riskFromNumber(Math.abs(value - 0.5), 0.3, 0.45),
  }))

  const overallStability = axisMap.stability ?? 0.5
  return wrap<EmotionalState>({
    primary_mood: cog.mood ?? cog.primary_mood ?? 'neutral',
    stability: overallStability,
    axes,
    risk: overallStability < 0.3 ? 'critical' : overallStability < 0.5 ? 'attention' : 'healthy',
  }, '/debug/cognition', cognition ? 'live' : 'computed')
}

function composeMemory(dash: Dashboard): ObservatoryResponse<MemoryStats> {
  const memDb = dash.memory_db ?? {}
  const total = (memDb.memory_items ?? 0) + (memDb.memory_embeddings ?? 0) + (memDb.symbolic_memory ?? 0)
  const saturation = total > 0 ? Math.min(total / 10000, 1.0) : 0

  const categories = [
    { name: 'Conversations', count: memDb.conversation_turns ?? 0, percentage: 0 },
    { name: 'Memory Items', count: memDb.memory_items ?? 0, percentage: 0 },
    { name: 'Embeddings', count: memDb.memory_embeddings ?? 0, percentage: 0 },
    { name: 'System Events', count: memDb.system_events ?? 0, percentage: 0 },
    { name: 'Symbolic', count: memDb.symbolic_memory ?? 0, percentage: 0 },
  ]

  const totalCount = categories.reduce((s, c) => s + c.count, 0) || 1
  for (const cat of categories) {
    cat.percentage = Math.round((cat.count / totalCount) * 100)
  }

  return wrap<MemoryStats>({
    db_size_mb: memDb.db_size_mb ?? 0,
    conversation_turns: memDb.conversation_turns ?? 0,
    memory_items: memDb.memory_items ?? 0,
    memory_embeddings: memDb.memory_embeddings ?? 0,
    system_events: memDb.system_events ?? 0,
    symbolic_memory: memDb.symbolic_memory ?? 0,
    saturation,
    categories,
    risk: saturation > 0.9 ? 'critical' : saturation > 0.7 ? 'attention' : 'healthy',
  }, '/debug/cognitive_dashboard')
}

function composePersona(dash: Dashboard, identityRaw: IdentityRaw | null): ObservatoryResponse<PersonaRouting> {
  const id = identityRaw ?? {}
  const model = dash.model ?? {}

  return wrap<PersonaRouting>({
    active_persona: id.active_persona ?? id.persona ?? model.env ?? 'default',
    blend_mode: id.blend_mode ?? 'single',
    blend_factors: id.blend_factors ?? {},
    manifests: Array.isArray(id.manifests) ? id.manifests.map((m: any) => ({
      name: m.name ?? 'unnamed',
      usage_count: m.usage_count ?? 0,
      last_used: m.last_used ?? '',
      weight: m.weight ?? 1.0,
    })) : [],
    risk: 'healthy',
  }, '/debug/identity')
}

function composeModules(dash: Dashboard): ObservatoryResponse<ModulesOverview> {
  const mod = dash.modules ?? {}
  const list: ModuleHealth[] = Array.isArray(mod.list) ? mod.list.map((m: any) => ({
    name: m.name ?? m.module ?? 'unknown',
    status: m.status ?? 'inactive',
    detail: m.detail ?? undefined,
    last_activity: m.last_activity ?? undefined,
  })) : []

  const degraded = list.filter(m => m.status === 'degraded').length
  return wrap<ModulesOverview>({
    total: mod.total ?? list.length,
    active: mod.active ?? list.filter(m => m.status === 'active').length,
    degraded: mod.degraded ?? degraded,
    modules: list,
    risk: degraded > 2 ? 'critical' : degraded > 0 ? 'attention' : 'healthy',
  }, '/debug/cognitive_dashboard')
}

function composeEvents(dash: Dashboard): ObservatoryResponse<RecentEvents> {
  const bus = dash.bus ?? {}
  // drift signals can be fetched separately but are optional
  const events: RecentEvents['events'] = []

  // Extract recent decisions as events
  const recent = Array.isArray(dash.recent_decisions) ? dash.recent_decisions : []
  for (const d of recent.slice(0, 20)) {
    events.push({
      timestamp: d.timestamp ?? new Date().toISOString(),
      type: d.action ?? d.type ?? 'decision',
      source: 'action_router',
      severity: 'info',
      message: d.reason ?? d.action ?? '',
    })
  }

  return wrap<RecentEvents>({
    total_emitted: bus.events_emitted ?? 0,
    callback_errors: bus.callback_errors ?? 0,
    events,
    risk: (bus.callback_errors ?? 0) > 5 ? 'attention' : 'healthy',
  }, '/debug/cognitive_dashboard')
}

function composeDebug(dash: Dashboard, statePlane: StatePlane | null): ObservatoryResponse<RawDebugData> {
  const sections: Record<string, unknown> = {
    cognitive_dashboard: dash,
  }
  if (statePlane) {
    sections.state_plane = statePlane
  }

  return wrap<RawDebugData>({
    sections,
    timestamp: new Date().toISOString(),
  }, '/debug/cognitive_dashboard + /debug/state_plane/audit')
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch all Observatory data by composing from /debug/* endpoints.
 *
 * Makes ~5 parallel requests:
 * 1. /debug/cognitive_dashboard (primary)
 * 2. /debug/cognition (emotional detail)
 * 3. /debug/identity (persona/traits)
 * 4. /debug/drift_monitor/summary (drift detail)
 * 5. /debug/state_plane/audit (debug raw data)
 */
export async function fetchObservatoryData(): Promise<ObservatoryData> {
  // Fan-out all fetches in parallel
  const [dashResult, cognitionResult, identityResult, driftResult, statePlaneResult] =
    await Promise.allSettled([
      safeFetch<Dashboard>('/debug/cognitive_dashboard'),
      safeFetch<CognitionData>('/debug/cognition'),
      safeFetch<IdentityRaw>('/debug/identity'),
      safeFetch<DriftSummary>('/debug/drift_monitor/summary'),
      safeFetch<StatePlane>('/debug/state_plane/audit'),
    ])

  const dash = dashResult.status === 'fulfilled' ? dashResult.value : null
  const cognition = cognitionResult.status === 'fulfilled' ? cognitionResult.value : null
  const identity = identityResult.status === 'fulfilled' ? identityResult.value : null
  const drift = driftResult.status === 'fulfilled' ? driftResult.value : null
  const statePlane = statePlaneResult.status === 'fulfilled' ? statePlaneResult.value : null

  // If primary dashboard fetch failed, return all nulls
  if (!dash) {
    return {
      overview: null,
      weights: null,
      identity: null,
      decisions: null,
      emotional: null,
      memory: null,
      persona: null,
      modules: null,
      events: null,
      debug: null,
    }
  }

  return {
    overview: composeOverview(dash),
    weights: composeWeights(dash, cognition),
    identity: composeIdentity(dash, identity, drift),
    decisions: composeDecisions(dash),
    emotional: composeEmotional(dash, cognition),
    memory: composeMemory(dash),
    persona: composePersona(dash, identity),
    modules: composeModules(dash),
    events: composeEvents(dash),
    debug: composeDebug(dash, statePlane),
  }
}
