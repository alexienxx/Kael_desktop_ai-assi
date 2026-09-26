import type { CognitiveFieldNode } from './stargate-types'

export interface StarfieldPosition {
  x: number
  y: number
  z: number
}
function hashIdentifier(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Deterministic CPU layout. It has no feedback path into Stargate. */
export function layoutCognitiveNodes(nodes: readonly CognitiveFieldNode[]): Map<string, StarfieldPosition> {
  const sorted = [...nodes].sort((left, right) => left.node_id.localeCompare(right.node_id))
  const positions = new Map<string, StarfieldPosition>()
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  sorted.forEach((node, index) => {
    const hash = hashIdentifier(`${node.kind}:${node.node_id}`)
    const phase = ((hash & 0xffff) / 0xffff) * Math.PI * 2
    const normalizedY = sorted.length === 1 ? 0 : 1 - (index / (sorted.length - 1)) * 2
    const radial = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY))
    const shell = 4.25 + (((hash >>> 16) & 0xff) / 255) * 2.75
    const angle = index * goldenAngle + phase

    positions.set(node.node_id, {
      x: Math.cos(angle) * radial * shell,
      y: normalizedY * shell,
      z: Math.sin(angle) * radial * shell,
    })
  })

  return positions
}
