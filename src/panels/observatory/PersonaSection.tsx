/**
 * PersonaSection — Observatory
 * Active persona, blend mode, manifest routing.
 */

import { motion } from 'framer-motion'
import { User, PaintBrush, Shuffle } from '@phosphor-icons/react'
import type { ObservatoryResponse, PersonaRouting } from '@/lib/observatory-types'
import { MetaBar, RiskBadge, GlassCard } from './shared'
import { Progress } from '@/components/ui/progress'

interface Props {
  data: ObservatoryResponse<PersonaRouting>
}

export function PersonaSection({ data }: Props) {
  const { data: d, meta } = data

  const blendEntries = Object.entries(d.blend_factors).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-3">
      <MetaBar meta={meta} title="Persona Routing" />
      <RiskBadge risk={d.risk} />

      {/* Active persona */}
      <GlassCard className="flex items-center gap-3 py-3">
        <User className="h-5 w-5 text-violet-400" />
        <div className="flex-1">
          <span className="text-xs font-medium">{d.active_persona}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Shuffle className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Blend: {d.blend_mode}</span>
          </div>
        </div>
      </GlassCard>

      {/* Blend factors */}
      {blendEntries.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Blend Factors</span>
          {blendEntries.map(([name, weight]) => (
            <div key={name} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px]">{name}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{(weight * 100).toFixed(0)}%</span>
              </div>
              <Progress value={Math.round(weight * 100)} className="h-1" />
            </div>
          ))}
        </div>
      )}

      {/* Manifests */}
      {d.manifests.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Manifests</span>
          {d.manifests.map((m) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 rounded-lg bg-background/30 px-3 py-1.5"
            >
              <PaintBrush className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] flex-1 truncate">{m.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground">×{m.usage_count}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{(m.weight * 100).toFixed(0)}%</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
