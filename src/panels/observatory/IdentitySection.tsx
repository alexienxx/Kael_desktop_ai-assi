/**
 * IdentitySection — Observatory
 * Drift score, coherence, traits, emerging/declining themes.
 */

import { motion } from 'framer-motion'
import { Fingerprint, ShieldCheck, TrendUp, TrendDown } from '@phosphor-icons/react'
import type { ObservatoryResponse, IdentityDrift } from '@/lib/observatory-types'
import { MetaBar, RiskBadge, TrendArrow, ValueBar, GlassCard } from './shared'

interface Props {
  data: ObservatoryResponse<IdentityDrift>
}

export function IdentitySection({ data }: Props) {
  const { data: d, meta } = data

  const driftPercent = Math.round(d.drift_score * 100)
  const coherencePercent = Math.round(d.coherence * 100)

  return (
    <div className="space-y-3">
      <MetaBar meta={meta} title="Identity & Drift" />
      <div className="flex items-center justify-between">
        <RiskBadge risk={d.risk} />
        <div className="flex items-center gap-1.5">
          <TrendArrow trend={d.drift_trend} />
          <span className="text-[10px] text-muted-foreground">Zone: {d.drift_zone}</span>
        </div>
      </div>

      {/* Drift & Coherence meters */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <Fingerprint className="h-4 w-4 text-amber-400" />
            <span className="text-[11px] text-muted-foreground">Drift Score</span>
          </div>
          <div className="text-xl font-bold text-foreground">{driftPercent}%</div>
          <ValueBar value={d.drift_score} label={undefined} />
        </GlassCard>

        <GlassCard className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] text-muted-foreground">Coherence</span>
          </div>
          <div className="text-xl font-bold text-foreground">{coherencePercent}%</div>
          <ValueBar value={d.coherence} color="bg-emerald-400" />
        </GlassCard>
      </div>

      {/* Traits */}
      {d.traits.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Personality Traits</span>
          {d.traits.map((t) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 rounded-lg bg-background/30 px-3 py-1.5"
            >
              <span className="text-[11px] flex-1">{t.name}</span>
              <TrendArrow trend={t.trend} />
              <span className="text-[11px] font-mono w-10 text-right">{t.score.toFixed(2)}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Emerging / Declining */}
      <div className="grid grid-cols-2 gap-3">
        {d.emerging_themes.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <TrendUp className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">Emerging</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {d.emerging_themes.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {d.declining_themes.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <TrendDown className="h-3 w-3 text-red-400" />
              <span className="text-[10px] text-red-400 font-medium">Declining</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {d.declining_themes.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-400/10 text-red-400">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
