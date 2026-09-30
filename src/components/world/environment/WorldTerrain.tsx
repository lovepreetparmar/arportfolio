import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getWorldScenery, type PatchSpot } from '../../../data/worldScenery'
import { createGroundTexture, WORLD_PALETTE, worldMat } from '../worldMaterials'
import { InstancedParts } from './InstancedParts'

function blobGeometry(p: PatchSpot): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  const steps = 28
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const wobble = 1 + 0.16 * Math.sin(3 * a + p.seed) + 0.09 * Math.sin(5 * a + p.seed * 0.7)
    const x = Math.cos(a) * p.radius * wobble * 1.25
    const y = Math.sin(a) * p.radius * wobble * 0.85
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  const g = new THREE.ShapeGeometry(shape, 6)
  g.rotateX(-Math.PI / 2)
  g.rotateY(p.rot)
  g.translate(p.x, 0, p.z)
  return g
}

const hillGeometry = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)
const hillMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 })
const HILL_TINTS = ['#a3bf86', '#94b27c', '#b3c996']

export function WorldTerrain() {
  const groundTexture = useMemo(() => createGroundTexture(), [])
  const { patches, hills } = getWorldScenery()

  const [grassGeo, deepGeo] = useMemo(() => {
    const light = patches.filter((p) => !p.deep).map(blobGeometry)
    const deep = patches.filter((p) => p.deep).map(blobGeometry)
    return [light.length ? mergeGeometries(light) : null, deep.length ? mergeGeometries(deep) : null]
  }, [patches])

  const hillItems = useMemo(
    () =>
      hills.map((h) => ({
        position: [h.x, -0.05, h.z] as [number, number, number],
        scale: [h.rx, h.ry, h.rz] as [number, number, number],
        color: HILL_TINTS[h.tint],
      })),
    [hills],
  )

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[95, 64]} />
        <meshStandardMaterial map={groundTexture} roughness={1} />
      </mesh>
      {grassGeo && (
        <mesh geometry={grassGeo} position={[0, 0.004, 0]} material={worldMat(WORLD_PALETTE.grass, 1)} receiveShadow />
      )}
      {deepGeo && (
        <mesh geometry={deepGeo} position={[0, 0.006, 0]} material={worldMat(WORLD_PALETTE.grassDeep, 1)} receiveShadow />
      )}
      <InstancedParts geometry={hillGeometry} material={hillMaterial} items={hillItems} />
    </group>
  )
}
