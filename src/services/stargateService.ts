import { transportFetchJson } from './backendTransport'
import type {
  CognitiveDecisionPressure,
  CognitiveFieldEdge,
  CognitiveFieldEdgeKind,
  CognitiveFieldNode,
  CognitiveFieldNodeKind,
  CognitiveFieldSnapshot,
} from '@/lib/stargate-types'

const NODE_KINDS = new Set<CognitiveFieldNodeKind>([
  'proposition', 'appraisal', 'open_question', 'tension', 'affect', 'desire',
  'curiosity', 'self_domain',
])
const EDGE_KINDS = new Set<CognitiveFieldEdgeKind>([
  'coactivation', 'competition', 'owner_context',
])
const FIELD_ID = /^field:[0-9a-f]{64}$/
const CANONICAL_ID = /^[a-z][a-z0-9_.:-]{0,159}$/
const SITUATION_ID = /^situation:[0-9a-f]{64}$/

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be an object`)
  }
  return value as Record<string, unknown>
}

function textValue(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new Error(`${path} must be a string`)
  return value
}

function boundedText(value: unknown, path: string, limit: number): string {
  const result = textValue(value, path)
  if (!result || result.length > limit) throw new Error(`${path} must be non-empty and bounded`)
  return result
}

function canonicalId(value: unknown, path: string): string {
  const result = textValue(value, path)
  if (!CANONICAL_ID.test(result)) throw new Error(`${path} must be a canonical identifier`)
  return result
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`)
  }
  return value
}

function nonNegativeInteger(value: unknown, path: string, positive = false): number {
  const number = finiteNumber(value, path)
  if (!Number.isSafeInteger(number) || number < (positive ? 1 : 0)) {
    throw new Error(`${path} must be a ${positive ? 'positive' : 'non-negative'} safe integer`)
  }
  return number
}

function boundedNumber(value: unknown, path: string, signed = false): number {
  const number = finiteNumber(value, path)
  const minimum = signed ? -1 : 0
  if (number < minimum || number > 1) throw new Error(`${path} is outside its declared range`)
  return number
}

function nullableNumber(value: unknown, path: string, signed = false): number | null {
  return value === null ? null : boundedNumber(value, path, signed)
}

function textList(value: unknown, path: string, limit: number, itemLimit = 200): string[] {
  if (!Array.isArray(value) || value.length > limit || value.some((item) => (
    typeof item !== 'string' || !item || item.length > itemLimit
  ))) {
    throw new Error(`${path} must be a string array`)
  }
  return value as string[]
}

function unique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${path} must not contain duplicates`)
}

function parseNode(value: unknown, index: number): CognitiveFieldNode {
  const raw = record(value, `nodes[${index}]`)
  const kind = textValue(raw.kind, `nodes[${index}].kind`) as CognitiveFieldNodeKind
  if (!NODE_KINDS.has(kind)) throw new Error(`nodes[${index}].kind is unsupported`)
  return {
    node_id: canonicalId(raw.node_id, `nodes[${index}].node_id`),
    kind,
    owner: canonicalId(raw.owner, `nodes[${index}].owner`),
    activation: nullableNumber(raw.activation, `nodes[${index}].activation`),
    salience: nullableNumber(raw.salience, `nodes[${index}].salience`),
    confidence: nullableNumber(raw.confidence, `nodes[${index}].confidence`),
    valence: nullableNumber(raw.valence, `nodes[${index}].valence`, true),
    velocity: nullableNumber(raw.velocity, `nodes[${index}].velocity`, true),
    epistemic_status: textValue(raw.epistemic_status, `nodes[${index}].epistemic_status`),
    source_refs: textList(raw.source_refs, `nodes[${index}].source_refs`, 32),
    symbolic_tags: textList(raw.symbolic_tags, `nodes[${index}].symbolic_tags`, 16, 160),
  }
}

function parseEdge(value: unknown, index: number): CognitiveFieldEdge {
  const raw = record(value, `edges[${index}]`)
  const kind = textValue(raw.kind, `edges[${index}].kind`) as CognitiveFieldEdgeKind
  if (!EDGE_KINDS.has(kind)) throw new Error(`edges[${index}].kind is unsupported`)
  return {
    edge_id: canonicalId(raw.edge_id, `edges[${index}].edge_id`),
    source_node_id: canonicalId(raw.source_node_id, `edges[${index}].source_node_id`),
    target_node_id: canonicalId(raw.target_node_id, `edges[${index}].target_node_id`),
    kind,
    weight: boundedNumber(raw.weight, `edges[${index}].weight`),
    evidence_refs: textList(raw.evidence_refs, `edges[${index}].evidence_refs`, 32),
  }
}

function parseDecisionPressure(value: unknown): CognitiveDecisionPressure {
  const raw = record(value, 'decision_pressure')
  const result: CognitiveDecisionPressure = {
    clarification: nullableNumber(raw.clarification, 'decision_pressure.clarification'),
    exploration: nullableNumber(raw.exploration, 'decision_pressure.exploration'),
    affective: nullableNumber(raw.affective, 'decision_pressure.affective'),
    goal: nullableNumber(raw.goal, 'decision_pressure.goal'),
    self_relevance: nullableNumber(raw.self_relevance, 'decision_pressure.self_relevance'),
    dominant_axis: textValue(raw.dominant_axis, 'decision_pressure.dominant_axis'),
  }
  if (!['clarification', 'exploration', 'affective', 'goal', 'self_relevance', 'unknown']
    .includes(result.dominant_axis)) {
    throw new Error('decision_pressure.dominant_axis is unsupported')
  }
  return result
}

export function parseCognitiveFieldSnapshot(value: unknown): CognitiveFieldSnapshot {
  const raw = record(value, 'stargate snapshot')
  const nodesRaw = raw.nodes
  const edgesRaw = raw.edges
  if (!Array.isArray(nodesRaw) || nodesRaw.length < 1 || nodesRaw.length > 96) {
    throw new Error('nodes must contain between 1 and 96 records')
  }
  if (!Array.isArray(edgesRaw) || edgesRaw.length > 384) {
    throw new Error('edges must contain at most 384 records')
  }
  const consistency = textValue(raw.consistency, 'consistency')
  if (consistency !== 'CONSISTENCY_PARTIAL' && consistency !== 'TURN_BOUND') {
    throw new Error('consistency is unsupported')
  }
  const continuity = textValue(raw.continuity_status, 'continuity_status')
  if (continuity !== 'PROCESS_LOCAL' && continuity !== 'RESTORED') {
    throw new Error('continuity_status is unsupported')
  }
  const ownerRaw = record(raw.owner_revisions, 'owner_revisions')
  if (Object.keys(ownerRaw).length > 16) throw new Error('owner_revisions exceeds its declared bound')
  const ownerRevisions: Record<string, string> = {}
  for (const [owner, revision] of Object.entries(ownerRaw)) {
    canonicalId(owner, `owner_revisions.${owner}.owner`)
    ownerRevisions[owner] = boundedText(revision, `owner_revisions.${owner}`, 160)
  }
  if (raw.schema_version !== 'stargate.field.snapshot/1.0') throw new Error('schema_version is unsupported')
  if (raw.mapping_version !== 'stargate.map/1.0') throw new Error('mapping_version is unsupported')
  if (raw.mode !== 'LIVE' || raw.read_only !== true) throw new Error('snapshot must be live and read-only')

  const snapshotId = textValue(raw.snapshot_id, 'snapshot_id')
  if (!FIELD_ID.test(snapshotId)) throw new Error('snapshot_id is not a Stargate field digest')
  const predecessor = raw.predecessor_snapshot_id === null
    ? null
    : textValue(raw.predecessor_snapshot_id, 'predecessor_snapshot_id')
  if (predecessor !== null && !FIELD_ID.test(predecessor)) {
    throw new Error('predecessor_snapshot_id is not a Stargate field digest')
  }
  const capturedAt = textValue(raw.captured_at, 'captured_at')
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(capturedAt) || !Number.isFinite(Date.parse(capturedAt))) {
    throw new Error('captured_at must be a timezone-aware timestamp')
  }
  const nodes = nodesRaw.map(parseNode)
  const nodeIds = nodes.map((node) => node.node_id)
  unique(nodeIds, 'node ids')
  const nodeIdSet = new Set(nodeIds)
  const edges = edgesRaw.map(parseEdge)
  unique(edges.map((edge) => edge.edge_id), 'edge ids')
  if (edges.some((edge) => (
    edge.source_node_id === edge.target_node_id
    || !nodeIdSet.has(edge.source_node_id)
    || !nodeIdSet.has(edge.target_node_id)
  ))) {
    throw new Error('edge endpoints must reference two distinct declared nodes')
  }
  const dominantNodeIds = textList(raw.dominant_node_ids, 'dominant_node_ids', 8, 160)
  if (dominantNodeIds.length > 8) throw new Error('dominant_node_ids exceeds its declared bound')
  unique(dominantNodeIds, 'dominant_node_ids')
  if (dominantNodeIds.some((nodeId) => !nodeIdSet.has(nodeId))) {
    throw new Error('dominant_node_ids must reference declared nodes')
  }

  return {
    schema_version: 'stargate.field.snapshot/1.0',
    mapping_version: 'stargate.map/1.0',
    snapshot_id: snapshotId,
    session_id: boundedText(raw.session_id, 'session_id', 200),
    turn_id: nonNegativeInteger(raw.turn_id, 'turn_id'),
    trace_id: boundedText(raw.trace_id, 'trace_id', 200),
    sequence: nonNegativeInteger(raw.sequence, 'sequence', true),
    captured_at: capturedAt,
    situation_id: (() => {
      const situationId = textValue(raw.situation_id, 'situation_id')
      if (!SITUATION_ID.test(situationId)) throw new Error('situation_id is not a situation digest')
      return situationId
    })(),
    consistency,
    nodes,
    edges,
    dominant_node_ids: dominantNodeIds,
    decision_pressure: parseDecisionPressure(raw.decision_pressure),
    owner_revisions: ownerRevisions,
    predecessor_snapshot_id: predecessor,
    continuity_status: continuity,
    mode: 'LIVE',
    read_only: true,
  }
}

export async function fetchStargateSnapshot(
  sessionId: string,
  signal?: AbortSignal,
): Promise<CognitiveFieldSnapshot> {
  const scope = sessionId.trim()
  if (!scope) throw new Error('A Stargate session scope is required')
  const payload = await transportFetchJson<unknown>(
    `/state/stargate?session_id=${encodeURIComponent(scope)}`,
    { signal },
  )
  const snapshot = parseCognitiveFieldSnapshot(payload)
  if (snapshot.session_id !== scope) {
    throw new Error('Stargate response does not match the requested session scope')
  }
  return snapshot
}
