import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getPathBranches } from '../../../data/worldPaths'
import { PLAZA_RADIUS, WORLD_HUB } from '../../../data/worldLayout'
import { WORLD_PALETTE } from '../worldMaterials'

function ribbon(points: THREE.Vector3[], width: number): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  let run = 0
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const tx = next.x - prev.x
    const tz = next.z - prev.z
    const len = Math.hypot(tx, tz) || 1
    const nx = -tz / len
    const nz = tx / len
    const p = points[i]
    if (i > 0) run += p.distanceTo(points[i - 1])
    positions.push(p.x + nx * width * 0.5, 0, p.z + nz * width * 0.5)
    positions.push(p.x - nx * width * 0.5, 0, p.z - nz * width * 0.5)
    uvs.push(0, run, 1, run)
    if (i < points.length - 1) {
      const a = i * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function pathMaterial(color: string, offset: number) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: -offset,
    polygonOffsetUnits: -offset,
  })
}

const edgeMat = pathMaterial(WORLD_PALETTE.pathEdge, 1)
const surfaceMat = pathMaterial(WORLD_PALETTE.path, 2)
const plazaRingMat = pathMaterial(WORLD_PALETTE.plazaRing, 3)
const plazaMat = pathMaterial(WORLD_PALETTE.plaza, 4)
const plazaInlayMat = pathMaterial(WORLD_PALETTE.pathEdge, 5)

export function WorldPaths() {
  const [edgeGeo, surfaceGeo] = useMemo(() => {
    const branches = getPathBranches()
    return [
      mergeGeometries(branches.map((b) => ribbon(b.render, 1.36))),
      mergeGeometries(branches.map((b) => ribbon(b.render, 1.06))),
    ]
  }, [])

  return (
    <group>
      <mesh geometry={edgeGeo} position={[0, 0.01, 0]} material={edgeMat} receiveShadow />
      <mesh geometry={surfaceGeo} position={[0, 0.014, 0]} material={surfaceMat} receiveShadow />

      <group position={[WORLD_HUB.x, 0, WORLD_HUB.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0, 0.018]} material={plazaRingMat} receiveShadow>
          <circleGeometry args={[PLAZA_RADIUS, 72]} />
        </mesh>
        <mesh position={[0, 0, 0.022]} material={plazaMat} receiveShadow>
          <circleGeometry args={[PLAZA_RADIUS - 0.22, 72]} />
        </mesh>
        <mesh position={[0, 0, 0.026]} material={plazaInlayMat} receiveShadow>
          <ringGeometry args={[1.28, 1.36, 72]} />
        </mesh>
        <mesh position={[0, 0, 0.026]} material={plazaInlayMat} receiveShadow>
          <ringGeometry args={[0.34, 0.4, 48]} />
        </mesh>
      </group>
    </group>
  )
}
