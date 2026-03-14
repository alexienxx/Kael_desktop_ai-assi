import { ThemePreset, ThemeSettings } from './types'

export const themePresets: Record<ThemePreset, Omit<ThemeSettings, 'preset'>> = {
  'aero-pastel': {
    accentGradient: 'linear-gradient(135deg, oklch(0.85 0.08 290), oklch(0.88 0.06 345))',
    bubbleStyle: 'rounded',
    borderRadius: 1,
    transparencyIntensity: 0.4,
    glowIntensity: 0.3,
    spacingMode: 'comfortable'
  },
  'pearl-frost': {
    accentGradient: 'linear-gradient(135deg, oklch(0.97 0.02 250), oklch(0.90 0.05 220))',
    bubbleStyle: 'soft',
    borderRadius: 0.875,
    transparencyIntensity: 0.5,
    glowIntensity: 0.2,
    spacingMode: 'comfortable'
  },
  'rose-nebula': {
    accentGradient: 'linear-gradient(135deg, oklch(0.88 0.08 350), oklch(0.85 0.10 300), oklch(0.87 0.09 320))',
    bubbleStyle: 'rounded',
    borderRadius: 1.25,
    transparencyIntensity: 0.35,
    glowIntensity: 0.4,
    spacingMode: 'spacious'
  }
}

export const defaultThemeSettings: ThemeSettings = {
  preset: 'aero-pastel',
  ...themePresets['aero-pastel']
}

export const accentGradients = [
  { name: 'Lavender Dream', value: 'linear-gradient(135deg, oklch(0.85 0.08 290), oklch(0.88 0.06 345))' },
  { name: 'Sky Breeze', value: 'linear-gradient(135deg, oklch(0.87 0.07 230), oklch(0.85 0.08 290))' },
  { name: 'Rose Mist', value: 'linear-gradient(135deg, oklch(0.88 0.08 350), oklch(0.85 0.10 300))' },
  { name: 'Pearl Glow', value: 'linear-gradient(135deg, oklch(0.97 0.02 250), oklch(0.92 0.04 270))' },
  { name: 'Violet Haze', value: 'linear-gradient(135deg, oklch(0.75 0.15 285), oklch(0.80 0.12 310))' },
  { name: 'Mint Aurora', value: 'linear-gradient(135deg, oklch(0.88 0.07 170), oklch(0.85 0.08 200))' }
]

export function applyThemeSettings(settings: ThemeSettings) {
  const root = document.documentElement
  
  root.style.setProperty('--radius', `${settings.borderRadius}rem`)
  root.style.setProperty('--glow-intensity', settings.glowIntensity.toString())
  root.style.setProperty('--transparency-level', settings.transparencyIntensity.toString())
  
  const glassAlpha = 0.3 + (settings.transparencyIntensity * 0.4)
  root.style.setProperty('--glass-bg', `oklch(0.98 0.01 280 / ${glassAlpha})`)
  
  const bubbleAlpha = 0.5 + (settings.transparencyIntensity * 0.3)
  
  switch (settings.preset) {
    case 'aero-pastel':
      root.style.setProperty('--assistant-bubble-bg', `oklch(0.92 0.05 290 / ${bubbleAlpha})`)
      root.style.setProperty('--user-bubble-bg', `oklch(0.88 0.06 345 / ${bubbleAlpha})`)
      root.style.setProperty('--primary', 'oklch(0.75 0.15 285)')
      root.style.setProperty('--accent', 'oklch(0.85 0.08 290)')
      break
    case 'pearl-frost':
      root.style.setProperty('--assistant-bubble-bg', `oklch(0.95 0.02 250 / ${bubbleAlpha})`)
      root.style.setProperty('--user-bubble-bg', `oklch(0.90 0.05 220 / ${bubbleAlpha})`)
      root.style.setProperty('--primary', 'oklch(0.70 0.12 240)')
      root.style.setProperty('--accent', 'oklch(0.88 0.05 230)')
      break
    case 'rose-nebula':
      root.style.setProperty('--assistant-bubble-bg', `oklch(0.90 0.08 320 / ${bubbleAlpha})`)
      root.style.setProperty('--user-bubble-bg', `oklch(0.88 0.08 350 / ${bubbleAlpha})`)
      root.style.setProperty('--primary', 'oklch(0.72 0.18 330)')
      root.style.setProperty('--accent', 'oklch(0.85 0.10 300)')
      break
  }
}

export function getBubbleClasses(style: ThemeSettings['bubbleStyle'], role: 'user' | 'assistant'): string {
  const baseClasses = 'px-4 py-3 backdrop-blur-xl transition-all duration-200'
  
  const radiusMap = {
    rounded: 'rounded-2xl',
    soft: 'rounded-xl',
    squared: 'rounded-lg'
  }
  
  const bgClasses = role === 'assistant' 
    ? 'bg-[var(--assistant-bubble-bg)] border border-white/20' 
    : 'bg-[var(--user-bubble-bg)] border border-white/30'
  
  return `${baseClasses} ${radiusMap[style]} ${bgClasses}`
}

export function getSpacingClasses(mode: ThemeSettings['spacingMode']): { message: string; container: string } {
  switch (mode) {
    case 'compact':
      return { message: 'gap-2', container: 'p-3' }
    case 'comfortable':
      return { message: 'gap-3', container: 'p-4' }
    case 'spacious':
      return { message: 'gap-4', container: 'p-6' }
  }
}
