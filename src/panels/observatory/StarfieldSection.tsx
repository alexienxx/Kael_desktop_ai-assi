import { useCallback, useMemo, useState } from 'react'
import { ArrowsClockwise, CursorClick, Eye, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useStargateSnapshot } from '@/hooks/useStargateSnapshot'
import type { CognitiveFieldNode } from '@/lib/stargate-types'
import StarfieldScene from './StarfieldScene'

interface StarfieldSectionProps {
  sessionId: string | null
}
function metric(value: number | null): string {
  return value === null ? 'Unknown' : value.toFixed(3)
}

export default function StarfieldSection({ sessionId }: StarfieldSectionProps) {
  const { snapshot, status, error, refresh } = useStargateSnapshot(true, sessionId)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectNode = useCallback((node: CognitiveFieldNode) => setSelectedNodeId(node.node_id), [])
  const selectedNode = useMemo(
    () => snapshot?.nodes.find((node) => node.node_id === selectedNodeId) ?? null,
    [selectedNodeId, snapshot],
  )

  if (status === 'unavailable') {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-6 text-center">
        <Warning className="mx-auto h-7 w-7 text-amber-300" />
        <h2 className="mt-3 text-sm font-semibold">Starfield unavailable</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Select an active conversation before opening its cognitive field.
        </p>
      </div>
    )
  }

  if (status === 'unconfigured') {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-6 text-center">
        <h2 className="text-sm font-semibold">Backend not configured</h2>
        <p className="mt-1 text-xs text-muted-foreground">Configure the authenticated Arrakis backend first.</p>
      </div>
    )
  }

  if ((status === 'loading' || status === 'idle') && !snapshot) {
    return <div className="h-[36rem] animate-pulse rounded-xl border border-border/50 bg-card/30" />
  }

  if (!snapshot) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-6 text-center">
        <h2 className="text-sm font-semibold text-red-300">Stargate snapshot unavailable</h2>
        <p className="mt-1 break-words text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => void refresh()}>
          <ArrowsClockwise className="mr-1.5 h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-semibold">Starfield · read-only projection</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Turn {snapshot.turn_id} · sequence {snapshot.sequence} · {snapshot.consistency}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refresh()}>
          <ArrowsClockwise className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
          Showing the last valid snapshot. Refresh failed: {error}
        </div>
      )}

      <div className="grid min-h-[36rem] gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-h-[36rem] overflow-hidden rounded-xl border border-border/50 bg-[#070914]">
          <StarfieldScene
            snapshot={snapshot}
            selectedNodeId={selectedNodeId}
            onSelectNode={selectNode}
          />
        </div>

        <aside className="rounded-xl border border-border/50 bg-card/35 p-4">
          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <p className="break-all font-mono text-cyan-200">{selectedNode.node_id}</p>
                <p className="mt-1 text-muted-foreground">{selectedNode.kind} · {selectedNode.owner}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                <dt className="text-muted-foreground">Activation</dt><dd>{metric(selectedNode.activation)}</dd>
                <dt className="text-muted-foreground">Salience</dt><dd>{metric(selectedNode.salience)}</dd>
                <dt className="text-muted-foreground">Confidence</dt><dd>{metric(selectedNode.confidence)}</dd>
                <dt className="text-muted-foreground">Valence</dt><dd>{metric(selectedNode.valence)}</dd>
                <dt className="text-muted-foreground">Velocity</dt><dd>{metric(selectedNode.velocity)}</dd>
                <dt className="text-muted-foreground">Epistemic</dt><dd>{selectedNode.epistemic_status}</dd>
              </dl>
              <div>
                <p className="mb-1 text-muted-foreground">Symbolic tags</p>
                {selectedNode.symbolic_tags.length ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.symbolic_tags.map((tag) => (
                      <span key={tag} className="rounded bg-cyan-300/10 px-1.5 py-0.5 text-cyan-200">{tag}</span>
                    ))}
                  </div>
                ) : <p>None declared</p>}
              </div>
              <div>
                <p className="mb-1 text-muted-foreground">Source references</p>
                {selectedNode.source_refs.length ? (
                  <ul className="space-y-1 break-all font-mono text-[10px]">
                    {selectedNode.source_refs.map((source) => <li key={source}>{source}</li>)}
                  </ul>
                ) : <p>None declared</p>}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
              <CursorClick className="h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">Select a node to inspect its declared state.</p>
            </div>
          )}
        </aside>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span>{snapshot.nodes.length} nodes</span>
        <span>{snapshot.edges.length} edges</span>
        <span>Dominant axis: {snapshot.decision_pressure.dominant_axis}</span>
        <span>Captured: {new Date(snapshot.captured_at).toLocaleString()}</span>
        <span>{snapshot.continuity_status}</span>
      </div>
    </div>
  )
}
