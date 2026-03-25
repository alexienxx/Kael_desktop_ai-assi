/**
 * Observatory Shared Primitives
 *
 * Reusable UI components for all Observatory sections.
 * Adapted from kael_nexus_hub/src/components/observatory/shared.tsx
 * for the desktop design system (phosphor icons, glass-panel, framer-motion).
 */

import { motion } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { Progress } from '@/components/ui/progress'
import {
  Pulse,
  WifiSlash,
  ArrowUp,
  ArrowDown,
  Minus,
  Warning,
  Clock,
  ArrowsClockwise,
  Info,
} from '@phosphor-icons/react'
import type { Freshness, RiskLevel, Trend, ObservatoryMeta } from '@/lib/observatory-types'

// ── MetaBar ──────────────────────────────────────────────────────────────────

interface MetaBarProps {
  meta: ObservatoryMeta
  title: string
}

export function MetaBar({ meta, title }: MetaBarProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex items-center gap-2">
        <FreshnessBadge freshness={meta.freshness} />
        {meta.lastUpdate && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(meta.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}

// ── FreshnessBadge ───────────────────────────────────────────────────────────

interface FreshnessBadgeProps {
  freshness: Freshness
}

const freshnessConfig: Record<Freshness, { label: string; className: string }> = {
  live: { label: 'Live', className: 'text-emerald-400 bg-emerald-400/10' },
  stale: { label: 'Stale', className: 'text-amber-400 bg-amber-400/10' },
  unavailable: { label: 'N/A', className: 'text-muted-foreground bg-muted/50' },
  computed: { label: 'Computed', className: 'text-blue-400 bg-blue-400/10' },
}

export function FreshnessBadge({ freshness }: FreshnessBadgeProps) {
  const cfg = freshnessConfig[freshness]
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── RiskBadge ────────────────────────────────────────────────────────────────

interface RiskBadgeProps {
  risk: RiskLevel
  label?: string
}

const riskConfig: Record<RiskLevel, { label: string; className: string; dotClass: string }> = {
  healthy: { label: 'Healthy', className: 'text-emerald-400', dotClass: 'bg-emerald-400' },
  attention: { label: 'Attention', className: 'text-amber-400', dotClass: 'bg-amber-400' },
  critical: { label: 'Critical', className: 'text-red-400', dotClass: 'bg-red-400' },
}

export function RiskBadge({ risk, label }: RiskBadgeProps) {
  const cfg = riskConfig[risk]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${cfg.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
      {label ?? cfg.label}
    </span>
  )
}

// ── TrendArrow ───────────────────────────────────────────────────────────────

interface TrendArrowProps {
  trend: Trend
  className?: string
}

export function TrendArrow({ trend, className = '' }: TrendArrowProps) {
  if (trend === 'rising') return <ArrowUp weight="bold" className={`h-3 w-3 text-emerald-400 ${className}`} />
  if (trend === 'falling') return <ArrowDown weight="bold" className={`h-3 w-3 text-red-400 ${className}`} />
  return <Minus weight="bold" className={`h-3 w-3 text-muted-foreground ${className}`} />
}

// ── Sparkline ────────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  width?: number
}

export function Sparkline({ data, color = '#34d399', height = 24, width = 60 }: SparklineProps) {
  if (!data.length) return null

  const chartData = data.map((v, i) => ({ idx: i, v }))
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${color.replace('#', '')})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── ValueBar ─────────────────────────────────────────────────────────────────

interface ValueBarProps {
  value: number
  max?: number
  label?: string
  color?: string
}

export function ValueBar({ value, max = 1, label, color }: ValueBarProps) {
  const pct = Math.min(Math.round((value / max) * 100), 100)
  const barColor = color
    ?? (pct > 80 ? 'bg-red-400' : pct > 50 ? 'bg-amber-400' : 'bg-emerald-400')

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className="text-[11px] font-medium text-foreground">{pct}%</span>
        </div>
      )}
      <Progress value={pct} className={`h-1.5 ${barColor}`} />
    </div>
  )
}

// ── SubsystemStatusDot ───────────────────────────────────────────────────────

interface SubsystemStatusDotProps {
  status: 'active' | 'degraded' | 'inactive'
}

export function SubsystemStatusDot({ status }: SubsystemStatusDotProps) {
  const colorMap = {
    active: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    inactive: 'bg-muted-foreground/40',
  }
  return (
    <motion.span
      className={`inline-block h-2 w-2 rounded-full ${colorMap[status]}`}
      animate={status === 'active' ? { scale: [1, 1.2, 1] } : undefined}
      transition={status === 'active' ? { duration: 2, repeat: Infinity } : undefined}
    />
  )
}

// ── Loading / Error / Pending states ─────────────────────────────────────────

export function SectionLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <ArrowsClockwise className="h-5 w-5 text-muted-foreground" />
      </motion.div>
      <span className="text-xs text-muted-foreground">Loading data…</span>
    </div>
  )
}

export function SectionError({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <WifiSlash className="h-5 w-5 text-red-400" />
      <span className="text-xs text-red-400">{message ?? 'Failed to load data'}</span>
    </div>
  )
}

export function SectionPending() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <Clock className="h-5 w-5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Waiting for first data…</span>
    </div>
  )
}

export function SectionUnconfigured() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <Info className="h-5 w-5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Backend not configured — open Settings first</span>
    </div>
  )
}

// ── WarningBanner ────────────────────────────────────────────────────────────

interface WarningBannerProps {
  message: string
}

export function WarningBanner({ message }: WarningBannerProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 border border-amber-400/20 px-3 py-2 mb-3">
      <Warning className="h-4 w-4 text-amber-400 shrink-0" />
      <span className="text-xs text-amber-400">{message}</span>
    </div>
  )
}

// ── GlassCard ────────────────────────────────────────────────────────────────

interface GlassCardProps {
  children: React.ReactNode
  className?: string
}

/** Wrapper that matches the desktop glass-panel design system. */
export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div className={`p-4 rounded-xl glass-panel border border-border/40 ${className}`}>
      {children}
    </div>
  )
}
