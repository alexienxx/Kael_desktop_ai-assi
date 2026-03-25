/**
 * Observatory Types
 *
 * Type definitions for the Kael Cognitive Observatory.
 * Mirrors the mobile (kael_nexus_hub) Observatory contract
 * but adapted for desktop consumption.
 *
 * Data source: composed from /debug/* endpoints (hybrid strategy).
 * When backend implements /observatory/* endpoints, the service layer
 * will switch transparently — these types remain stable.
 */

// ── Meta & envelope ──────────────────────────────────────────────────────────

export type Freshness = 'live' | 'stale' | 'unavailable' | 'computed'
export type RiskLevel = 'healthy' | 'attention' | 'critical'
export type Trend = 'rising' | 'falling' | 'stable'

export interface ObservatoryMeta {
  freshness: Freshness
  lastUpdate: string | null
  source: string
}

export interface ObservatoryResponse<T> {
  data: T
  meta: ObservatoryMeta
}

// ── 1. Core Overview ─────────────────────────────────────────────────────────

export interface SubsystemStatus {
  name: string
  status: 'active' | 'degraded' | 'inactive'
  detail?: string
}

export interface CoreOverview {
  model: string
  uptime_seconds: number
  heartbeat_age_s: number
  adaptive_tick_s: number
  modules_total: number
  modules_active: number
  modules_degraded: number
  flags: Record<string, boolean>
  subsystems: SubsystemStatus[]
  risk: RiskLevel
}

// ── 2. Weights Health ────────────────────────────────────────────────────────

export interface WeightEntry {
  name: string
  value: number
  category: string
  trend: Trend
  history: number[]
  impact: string
}

export interface WeightsHealth {
  total_weights: number
  categories: string[]
  weights: WeightEntry[]
  overall_risk: RiskLevel
}

// ── 3. Identity Drift ────────────────────────────────────────────────────────

export interface PersonalityTrait {
  name: string
  score: number
  trend: Trend
  baseline: number
}

export interface IdentityDrift {
  drift_score: number
  drift_zone: string
  drift_trend: Trend
  coherence: number
  traits: PersonalityTrait[]
  emerging_themes: string[]
  declining_themes: string[]
  risk: RiskLevel
}

// ── 4. Decision Preferences ──────────────────────────────────────────────────

export interface DecisionPath {
  action: string
  count: number
  last_used: string
  success_rate: number
}

export interface DecisionPreferences {
  total_decisions: number
  action_distribution: Record<string, number>
  recent_paths: DecisionPath[]
  top_factors: string[]
  risk: RiskLevel
}

// ── 5. Emotional State ───────────────────────────────────────────────────────

export interface EmotionalAxis {
  name: string
  value: number
  range: [number, number]
  trend: Trend
  history: number[]
  risk: RiskLevel
}

export interface EmotionalState {
  primary_mood: string
  stability: number
  axes: EmotionalAxis[]
  risk: RiskLevel
}

// ── 6. Memory Stats ──────────────────────────────────────────────────────────

export interface MemoryCategory {
  name: string
  count: number
  percentage: number
}

export interface MemoryStats {
  db_size_mb: number
  conversation_turns: number
  memory_items: number
  memory_embeddings: number
  system_events: number
  symbolic_memory: number
  saturation: number
  categories: MemoryCategory[]
  risk: RiskLevel
}

// ── 7. Persona Routing ───────────────────────────────────────────────────────

export interface ManifestUsage {
  name: string
  usage_count: number
  last_used: string
  weight: number
}

export interface PersonaRouting {
  active_persona: string
  blend_mode: string
  blend_factors: Record<string, number>
  manifests: ManifestUsage[]
  risk: RiskLevel
}

// ── 8. Modules Overview ──────────────────────────────────────────────────────

export interface ModuleHealth {
  name: string
  status: 'active' | 'degraded' | 'inactive' | 'wired' | 'decorative' | 'broken'
  detail?: string
  last_activity?: string
}

export interface ModulesOverview {
  total: number
  active: number
  degraded: number
  modules: ModuleHealth[]
  risk: RiskLevel
}

// ── 9. Recent Events ─────────────────────────────────────────────────────────

export interface InternalEvent {
  timestamp: string
  type: string
  source: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
}

export interface RecentEvents {
  total_emitted: number
  callback_errors: number
  events: InternalEvent[]
  risk: RiskLevel
}

// ── 10. Raw Debug ────────────────────────────────────────────────────────────

export interface RawDebugData {
  sections: Record<string, unknown>
  timestamp: string
}

// ── Aggregated Observatory data ──────────────────────────────────────────────

export interface ObservatoryData {
  overview: ObservatoryResponse<CoreOverview> | null
  weights: ObservatoryResponse<WeightsHealth> | null
  identity: ObservatoryResponse<IdentityDrift> | null
  decisions: ObservatoryResponse<DecisionPreferences> | null
  emotional: ObservatoryResponse<EmotionalState> | null
  memory: ObservatoryResponse<MemoryStats> | null
  persona: ObservatoryResponse<PersonaRouting> | null
  modules: ObservatoryResponse<ModulesOverview> | null
  events: ObservatoryResponse<RecentEvents> | null
  debug: ObservatoryResponse<RawDebugData> | null
}

export type ObservatorySectionKey = keyof ObservatoryData
