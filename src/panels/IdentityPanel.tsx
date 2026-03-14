import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { IdentityData } from '@/lib/types'

interface IdentityPanelProps {
  data: IdentityData | null
}

export function IdentityPanel({ data }: IdentityPanelProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
        No identity data available
      </div>
    )
  }

  const radarData = [
    { axis: 'Baseline', value: data.baseline },
    { axis: 'Mentor', value: data.mentor },
    { axis: 'Dominant', value: data.dominant },
    { axis: 'Alignment', value: data.identity_alignment },
  ]

  const alignmentPct = Math.round(data.identity_alignment * 100)
  const alignmentColor =
    alignmentPct >= 75 ? 'text-emerald-500' : alignmentPct >= 50 ? 'text-amber-500' : 'text-rose-500'

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Identity Field</h3>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
            <PolarGrid stroke="oklch(0.75 0.15 285 / 0.25)" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
            <Radar
              dataKey="value"
              stroke="oklch(0.75 0.15 285)"
              fill="oklch(0.75 0.15 285)"
              fillOpacity={0.25}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Baseline', value: data.baseline },
          { label: 'Mentor', value: data.mentor },
          { label: 'Dominant', value: data.dominant },
        ].map(({ label, value }) => (
          <div key={label} className="p-2 rounded-lg glass-panel border border-border/30">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-sm font-semibold mt-0.5">{Math.round(value * 100)}%</div>
            <div className="mt-1.5 h-1 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${value * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}

        <div className="p-2 rounded-lg glass-panel border border-border/30">
          <div className="text-xs text-muted-foreground">Alignment</div>
          <div className={`text-sm font-semibold mt-0.5 ${alignmentColor}`}>
            {alignmentPct}%
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-muted/40 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${alignmentPct >= 75 ? 'bg-emerald-500' : alignmentPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${alignmentPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Stability pulse */}
      <div className="flex items-center gap-2 mt-1">
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-2 w-2 rounded-full bg-primary"
        />
        <span className="text-xs text-muted-foreground">Identity core stable</span>
      </div>
    </div>
  )
}
