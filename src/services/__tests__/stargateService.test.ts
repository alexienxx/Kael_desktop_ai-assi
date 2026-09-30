import { describe, expect, it } from 'vitest'
import { layoutCognitiveNodes } from '@/lib/starfield-layout'
import { parseCognitiveFieldSnapshot } from '@/services/stargateService'
import type { CognitiveFieldNode } from '@/lib/stargate-types'

const node: CognitiveFieldNode = {
  node_id: 'affect.current',
  kind: 'affect',
  owner: 'affect',
  activation: null,
  salience: 0.7,
  confidence: null,
  valence: -0.2,
  velocity: null,
  epistemic_status: 'derived',
  source_refs: ['affect:revision-4'],
  symbolic_tags: ['affect'],
}

const validSnapshot = {
  schema_version: 'stargate.field.snapshot/1.0',
  mapping_version: 'stargate.map/1.0',
  snapshot_id: `field:${'a'.repeat(64)}`,
  session_id: 'session-1',
  turn_id: 5,
  trace_id: 'trace-1',
  sequence: 2,
  captured_at: '2026-09-27T10:00:00+00:00',
  situation_id: `situation:${'b'.repeat(64)}`,
  consistency: 'TURN_BOUND',
  nodes: [node],
  edges: [],
  dominant_node_ids: ['affect.current'],
  decision_pressure: {
    clarification: null,
    exploration: 0.4,
    affective: 0.7,
    goal: null,
    self_relevance: 0.2,
    dominant_axis: 'affective',
  },
  owner_revisions: { affect: 'revision-4' },
  predecessor_snapshot_id: null,
  continuity_status: 'PROCESS_LOCAL',
  mode: 'LIVE',
  read_only: true,
}

describe('Stargate Starfield contracts', () => {
  it('preserves unknown metrics as null', () => {
    const parsed = parseCognitiveFieldSnapshot(validSnapshot)
    expect(parsed.nodes[0].activation).toBeNull()
    expect(parsed.nodes[0].confidence).toBeNull()
    expect(parsed.decision_pressure.clarification).toBeNull()
  })

  it('rejects a projection that is not explicitly read-only', () => {
    expect(() => parseCognitiveFieldSnapshot({ ...validSnapshot, read_only: false }))
      .toThrow('snapshot must be live and read-only')
  })

  it('produces a deterministic CPU layout', () => {
    const first = layoutCognitiveNodes([node])
    const second = layoutCognitiveNodes([node])
    expect(first.get(node.node_id)).toEqual(second.get(node.node_id))
  })
})
