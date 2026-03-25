/**
 * ModulesSection — Observatory
 * Module list with status indicators.
 */

import { motion } from 'framer-motion'
import { Package, CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react'
import type { ObservatoryResponse, ModulesOverview, ModuleHealth } from '@/lib/observatory-types'
import { MetaBar, RiskBadge, SubsystemStatusDot, GlassCard } from './shared'

interface Props {
  data: ObservatoryResponse<ModulesOverview>
}

function statusIcon(status: ModuleHealth['status']) {
  switch (status) {
    case 'active':
    case 'wired':
      return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" weight="fill" />
    case 'degraded':
    case 'decorative':
      return <WarningCircle className="h-3.5 w-3.5 text-amber-400" weight="fill" />
    case 'inactive':
    case 'broken':
      return <XCircle className="h-3.5 w-3.5 text-red-400" weight="fill" />
    default:
      return <Package className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

export function ModulesSection({ data }: Props) {
  const { data: d, meta } = data

  return (
    <div className="space-y-3">
      <MetaBar meta={meta} title="Modules" />
      <div className="flex items-center justify-between">
        <RiskBadge risk={d.risk} />
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <SubsystemStatusDot status="active" /> {d.active} active
          </span>
          <span className="flex items-center gap-1">
            <SubsystemStatusDot status="degraded" /> {d.degraded} degraded
          </span>
          <span>{d.total} total</span>
        </div>
      </div>

      {/* Module list */}
      <div className="space-y-1">
        {d.modules.map((m, i) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className="flex items-center gap-2 rounded-lg bg-background/30 px-3 py-2"
          >
            {statusIcon(m.status)}
            <span className="text-[11px] flex-1 truncate">{m.name}</span>
            <span className={`text-[10px] capitalize ${
              m.status === 'active' || m.status === 'wired' ? 'text-emerald-400' :
              m.status === 'degraded' || m.status === 'decorative' ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {m.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
