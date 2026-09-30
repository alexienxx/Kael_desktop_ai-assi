export type CognitiveFieldNodeKind =
  | 'proposition'
  | 'appraisal'
  | 'open_question'
  | 'tension'
  | 'affect'
  | 'desire'
  | 'curiosity'
  | 'self_domain'

export type CognitiveFieldEdgeKind = 'coactivation' | 'competition' | 'owner_context'
export type CognitiveFieldConsistency = 'CONSISTENCY_PARTIAL' | 'TURN_BOUND'

export interface CognitiveFieldNode {
  node_id: string
  kind: CognitiveFieldNodeKind
  owner: string
  activation: number | null
  salience: number | null
  confidence: number | null
  valence: number | null
  velocity: number | null
  epistemic_status: string
  source_refs: string[]
  symbolic_tags: string[]
}
export interface CognitiveFieldEdge {
  edge_id: string
  source_node_id: string
  target_node_id: string
  kind: CognitiveFieldEdgeKind
  weight: number
  evidence_refs: string[]
}

export interface CognitiveDecisionPressure {
  clarification: number | null
  exploration: number | null
  affective: number | null
  goal: number | null
  self_relevance: number | null
  dominant_axis: string
}

export interface CognitiveFieldSnapshot {
  schema_version: 'stargate.field.snapshot/1.0'
  mapping_version: 'stargate.map/1.0'
  snapshot_id: string
  session_id: string
  turn_id: number
  trace_id: string
  sequence: number
  captured_at: string
  situation_id: string
  consistency: CognitiveFieldConsistency
  nodes: CognitiveFieldNode[]
  edges: CognitiveFieldEdge[]
  dominant_node_ids: string[]
  decision_pressure: CognitiveDecisionPressure
  owner_revisions: Record<string, string>
  predecessor_snapshot_id: string | null
  continuity_status: 'PROCESS_LOCAL' | 'RESTORED'
  mode: 'LIVE'
  read_only: true
}
