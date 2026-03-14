import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { DriftData } from '@/lib/types'

interface DriftPanelProps {
  data: DriftData | null
}

function driftColor(score: number) {
  if (score < 0.25) return { text: 'text-blue-400', bg: 'bg-blue-400', bar: 'bg-blue-400', label: 'Stable' }
  if (score < 0.5) return { text: 'text-purple-400', bg: 'bg-purple-400', bar: 'bg-purple-400', label: 'Neutral' }
  return { text: 'text-rose-400', bg: 'bg-rose-400', bar: 'bg-rose-400', label: 'Drift Detected' }
}

export function DriftPanel({ data }: DriftPanelProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
        No drift data available
      </div>
    )
  }

  const colors = driftColor(data.drift_score)

  const radarData = Object.entries(data.vector).map(([key, value]) => ({
    axis: key.charAt(0).toUpperCase() + key.slice(1),
    value,
  }))

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Drift Monitor</h3>

      {/* Drift gauge */}
      <div className="p-3 rounded-lg glass-panel border border-border/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Drift Score</span>
          <span className={`text-xs font-semibold ${colors.text}`}>{colors.label}</span>
        </div>
        <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${colors.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${data.drift_score * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className={`text-lg font-bold mt-1 ${colors.text}`}>
          {Math.round(data.drift_score * 100)}%
        </div>
      </div>

      {/* Radar */}
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
            <PolarGrid stroke="oklch(0.75 0.15 285 / 0.2)" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: 'currentColor' }} className="text-muted-foreground" />
            <Radar
              dataKey="value"
              stroke={data.drift_score < 0.25 ? '#60a5fa' : data.drift_score < 0.5 ? '#c084fc' : '#fb7185'}
              fill={data.drift_score < 0.25 ? '#60a5fa' : data.drift_score < 0.5 ? '#c084fc' : '#fb7185'}
              fillOpacity={0.2}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Stability */}
      <div className="flex gap-2">
        <div className="flex-1 p-2 rounded-lg glass-panel border border-border/30 text-center">
          <div className="text-xs text-muted-foreground">Stability</div>
          <div className="text-sm font-semibold text-blue-400 mt-0.5">
            {Math.round(data.stability_score * 100)}%
          </div>
        </div>
        <div className="flex-1 p-2 rounded-lg glass-panel border border-border/30 text-center">
          <div className="text-xs text-muted-foreground">Alignment</div>
          <div className="text-sm font-semibold text-purple-400 mt-0.5">
            {Math.round(data.identity_alignment * 100)}%
          </div>
        </div>
      </div>
    </div>
  )
}
