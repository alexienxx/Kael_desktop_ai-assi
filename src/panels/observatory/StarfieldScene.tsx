import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { layoutCognitiveNodes } from '@/lib/starfield-layout'
import type { CognitiveFieldNode, CognitiveFieldSnapshot } from '@/lib/stargate-types'

interface StarfieldSceneProps {
  snapshot: CognitiveFieldSnapshot
  selectedNodeId: string | null
  onSelectNode: (node: CognitiveFieldNode) => void
}

const KIND_COLORS: Record<CognitiveFieldNode['kind'], number> = {
  proposition: 0x6ee7f9,
  appraisal: 0xa78bfa,
  open_question: 0xfacc15,
  tension: 0xfb7185,
  affect: 0xf472b6,
  desire: 0x34d399,
  curiosity: 0x38bdf8,
  self_domain: 0xc4b5fd,
}

export default function StarfieldScene({ snapshot, selectedNodeId, onSelectNode }: StarfieldSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const [webglError, setWebglError] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch (cause) {
      setWebglError(cause instanceof Error ? cause.message : 'WebGL initialization failed')
      return
    }

    setWebglError(null)
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x070914, 0.035)
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80)
    camera.position.set(0, 1.5, 15)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.className = 'block h-full w-full rounded-xl'
    renderer.domElement.setAttribute('aria-label', 'Interactive read-only Starfield projection')
    renderer.domElement.setAttribute('role', 'img')
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.075
    controls.minDistance = 6
    controls.maxDistance = 28
    controls.enablePan = false

    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const keyLight = new THREE.PointLight(0x8b5cf6, 18, 32)
    keyLight.position.set(4, 6, 8)
    scene.add(keyLight)

    const positions = layoutCognitiveNodes(snapshot.nodes)
    const nodeById = new Map(snapshot.nodes.map((node) => [node.node_id, node]))
    const nodeGeometry = new THREE.SphereGeometry(1, 18, 14)
    const materials = new Map<CognitiveFieldNode['kind'], THREE.MeshStandardMaterial>()
    const meshes = new Map<string, THREE.Mesh>()

    for (const node of snapshot.nodes) {
      let material = materials.get(node.kind)
      if (!material) {
        const color = KIND_COLORS[node.kind]
        material = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.36,
          roughness: 0.48,
          metalness: 0.1,
        })
        materials.set(node.kind, material)
      }
      const mesh = new THREE.Mesh(nodeGeometry, material)
      const position = positions.get(node.node_id)
      if (!position) continue
      mesh.position.set(position.x, position.y, position.z)
      const prominence = typeof node.salience === 'number'
        ? node.salience
        : typeof node.activation === 'number'
          ? node.activation
          : null
      const baseScale = prominence === null ? 0.28 : 0.22 + prominence * 0.32
      mesh.scale.setScalar(baseScale)
      mesh.userData = { nodeId: node.node_id, baseScale }
      scene.add(mesh)
      meshes.set(node.node_id, mesh)
    }
    meshesRef.current = meshes

    const linePositions: number[] = []
    const lineColors: number[] = []
    for (const edge of snapshot.edges) {
      const source = positions.get(edge.source_node_id)
      const target = positions.get(edge.target_node_id)
      if (!source || !target) continue
      linePositions.push(source.x, source.y, source.z, target.x, target.y, target.z)
      const shade = edge.kind === 'competition'
        ? new THREE.Color(0xfb7185)
        : edge.kind === 'owner_context'
          ? new THREE.Color(0xa78bfa)
          : new THREE.Color(0x67e8f9)
      const intensity = 0.24 + edge.weight * 0.5
      lineColors.push(
        shade.r * intensity, shade.g * intensity, shade.b * intensity,
        shade.r * intensity, shade.g * intensity, shade.b * intensity,
      )
    }
    const edgeGeometry = new THREE.BufferGeometry()
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    edgeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3))
    const edgeMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.72 })
    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial)
    scene.add(edgeLines)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const onPointerDown = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects([...meshes.values()], false)[0]
      const nodeId = hit?.object.userData.nodeId
      if (typeof nodeId !== 'string') return
      const node = nodeById.get(nodeId)
      if (node) onSelectNode(node)
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)

    const resize = () => {
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    let frameId = 0
    let rendering = false
    let previousFrame = 0
    const frameInterval = 1000 / 30
    const renderFrame = (timestamp: number) => {
      if (!rendering) return
      if (timestamp - previousFrame >= frameInterval) {
        previousFrame = timestamp
        controls.update()
        renderer.render(scene, camera)
      }
      frameId = window.requestAnimationFrame(renderFrame)
    }
    const startRendering = () => {
      if (rendering || document.hidden) return
      rendering = true
      previousFrame = 0
      frameId = window.requestAnimationFrame(renderFrame)
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        rendering = false
        window.cancelAnimationFrame(frameId)
      } else {
        startRendering()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    startRendering()

    return () => {
      rendering = false
      window.cancelAnimationFrame(frameId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      controls.dispose()
      nodeGeometry.dispose()
      materials.forEach((material) => material.dispose())
      edgeGeometry.dispose()
      edgeMaterial.dispose()
      scene.clear()
      renderer.renderLists.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
      meshesRef.current.clear()
    }
  }, [snapshot, onSelectNode])

  useEffect(() => {
    meshesRef.current.forEach((mesh, nodeId) => {
      const baseScale = mesh.userData.baseScale
      if (typeof baseScale !== 'number') return
      mesh.scale.setScalar(nodeId === selectedNodeId ? baseScale * 1.55 : baseScale)
    })
  }, [selectedNodeId, snapshot.snapshot_id])

  if (webglError) {
    return (
      <div className="h-full overflow-auto rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
        <p className="text-sm font-medium text-amber-300">3D rendering unavailable</p>
        <p className="mt-1 text-xs text-muted-foreground">{webglError}</p>
        <ul className="mt-4 space-y-1 text-xs">
          {snapshot.nodes.map((node) => (
            <li key={node.node_id}>
              <button className="text-left hover:text-cyan-300" onClick={() => onSelectNode(node)}>
                {node.node_id} · {node.kind} · {node.owner}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return <div ref={hostRef} className="h-full min-h-[28rem] w-full rounded-xl bg-[#070914]" />
}
