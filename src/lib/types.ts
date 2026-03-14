export type MessageRole = 'user' | 'assistant'

export type MessageContentType = 'text' | 'image' | 'audio'

export interface MessageContent {
  type: MessageContentType
  text?: string
  imageUrl?: string
  audioUrl?: string
  audioDuration?: number
  imageAlt?: string
}

export interface Message {
  id: string
  role: MessageRole
  content: MessageContent
  timestamp: Date
  conversationId: string
}

export interface Conversation {
  id: string
  title: string
  lastMessage?: string
  timestamp: Date
  messageCount: number
}

export type ThemePreset = 'aero-pastel' | 'pearl-frost' | 'rose-nebula'

export type BubbleStyle = 'rounded' | 'soft' | 'squared'

export type SpacingMode = 'compact' | 'comfortable' | 'spacious'

export interface ThemeSettings {
  preset: ThemePreset
  accentGradient: string
  bubbleStyle: BubbleStyle
  borderRadius: number
  transparencyIntensity: number
  glowIntensity: number
  spacingMode: SpacingMode
}

export interface AppSettings {
  theme: ThemeSettings
  fontSize: number
  messageWidth: 'narrow' | 'medium' | 'wide'
  showTimestamps: boolean
}

export interface DownloadedMedia {
  id: string
  type: 'image' | 'audio'
  url: string
  filename: string
  timestamp: Date
  conversationId: string
  messageId: string
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface BackendConfig {
  baseUrl: string
  apiKey?: string
  timeout: number
}

// ── Control Center types ──────────────────────────────────────────────────────

export type CognitivePipelineStage =
  | 'user_input'
  | 'memory_recall'
  | 'emotion_update'
  | 'persona_selected'
  | 'decision'
  | 'generation_start'
  | 'generation_token'

export interface CognitiveEvent {
  stage: CognitivePipelineStage
  token?: string
  timestamp: number
}

export interface IdentityData {
  baseline: number
  mentor: number
  dominant: number
  identity_alignment: number
}

export interface DriftData {
  drift_score: number
  stability_score: number
  identity_alignment: number
  vector: {
    architecture: number
    emotion: number
    memory: number
    calls: number
    config: number
  }
}

export interface MemoryData {
  long_term_count: number
  symbolic_motifs: string[]
  timeline_events: number
  recall_confidence: number
}

export type ServiceStatus = 'running' | 'active' | 'idle' | 'error'

export interface RuntimeData {
  services: Record<string, ServiceStatus>
  modules_registered: number
  uptime: number
}

export interface AutonomyEvent {
  id: string
  reason: string
  action: string
  confidence: number
  timestamp: number
}
