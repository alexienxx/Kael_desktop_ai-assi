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
