/**
 * DebugSection — Observatory
 * Raw JSON viewer with collapsible sections.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code, CaretDown, CaretRight, Copy, Check } from '@phosphor-icons/react'
import type { ObservatoryResponse, RawDebugData } from '@/lib/observatory-types'
import { MetaBar, GlassCard } from './shared'
import { Button } from '@/components/ui/button'

interface Props {
  data: ObservatoryResponse<RawDebugData>
}

function CollapsibleSection({ name, data }: { name: string; data: unknown }) {
  const [open, setOpen] = useState(false)
  const json = JSON.stringify(data, null, 2)

  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [json])

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-background/30 transition-colors"
      >
        {open ? (
          <CaretDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <CaretRight className="h-3 w-3 text-muted-foreground" />
        )}
        <Code className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-medium flex-1">{name}</span>
        <span className="text-[10px] text-muted-foreground">{json.length} chars</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative px-3 pb-3">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-0 right-3 h-6 w-6 p-0"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-80 p-2 rounded-md bg-background/40">
                {json}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DebugSection({ data }: Props) {
  const { data: d, meta } = data
  const sectionNames = Object.keys(d.sections)

  return (
    <div className="space-y-3">
      <MetaBar meta={meta} title="Raw Debug Data" />
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Code className="h-3.5 w-3.5" />
        <span>{sectionNames.length} data sections</span>
        <span>·</span>
        <span>{d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : '—'}</span>
      </div>

      <div className="space-y-1.5">
        {sectionNames.map((name) => (
          <CollapsibleSection key={name} name={name} data={d.sections[name]} />
        ))}
      </div>
    </div>
  )
}
