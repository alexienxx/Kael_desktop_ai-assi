import { motion } from 'framer-motion'
import { CognitivePipelineStage, CognitiveEvent } from '@/lib/types'
import { Brain, Database, Smiley, UserSwitch, Lightbulb, Spinner } from '@phosphor-icons/react'

interface CognitiveFlowPanelProps {
  events: CognitiveEvent[]
}

const STAGES: { stage: CognitivePipelineStage; label: string; icon: React.ComponentType<{ className?: string; weight?: string }> }[] = [
  { stage: 'user_input', label: 'User Input', icon: UserSwitch },
  { stage: 'memory_recall', label: 'Memory Recall', icon: Database },
  { stage: 'emotion_update', label: 'Emotion Update', icon: Smiley },
  { stage: 'persona_selected', label: 'Persona Router', icon: UserSwitch },
  { stage: 'decision', label: 'Decision Layer', icon: Lightbulb },
  { stage: 'generation_start', label: 'Response Generation', icon: Brain },
]

export function CognitiveFlowPanel({ events }: CognitiveFlowPanelProps) {
  const activeStages = new Set(events.map(e => e.stage))
  const generationTokens = events.filter(e => e.stage === 'generation_token').map(e => e.token).join('')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground">Cognitive Flow</h3>
        {activeStages.size > 0 && (
          <span className="flex items-center gap-1 text-xs text-primary">
            <Spinner className="h-3 w-3 animate-spin" />
            Active
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 relative">
        {/* Vertical connector line spanning all stages */}
        <div className="absolute left-3.5 top-3.5 bottom-3.5 w-px bg-border/25 -z-10" />

        {STAGES.map(({ stage, label, icon: Icon }) => {
          const isActive = activeStages.has(stage)
          return (
            <div key={stage} className="flex items-center gap-2">
              <motion.div
                animate={{ scale: isActive ? [1, 1.2, 1] : 1, opacity: isActive ? 1 : 0.35 }}
                transition={{ duration: 0.5, repeat: isActive ? Infinity : 0, repeatDelay: 1.5 }}
                className={`flex items-center justify-center h-7 w-7 rounded-full border shrink-0 transition-colors ${
                  isActive
                    ? 'border-primary/70 bg-primary/20 text-primary'
                    : 'border-border/40 bg-muted/30 text-muted-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" weight={isActive ? 'fill' : 'regular'} />
              </motion.div>

              <div className={`flex-1 text-xs font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </div>

              {isActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                />
              )}
            </div>
          )
        })}
      </div>

      {generationTokens && (
        <div className="mt-2 p-2.5 rounded-lg glass-panel border border-primary/20 text-xs text-foreground/80 font-mono leading-relaxed max-h-20 overflow-y-auto">
          {generationTokens}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="inline-block w-0.5 h-3 bg-primary ml-0.5 align-middle"
          />
        </div>
      )}

      {events.length === 0 && (
        <div className="py-6 text-center text-xs text-muted-foreground">
          Waiting for cognitive events…
        </div>
      )}
    </div>
  )
}
