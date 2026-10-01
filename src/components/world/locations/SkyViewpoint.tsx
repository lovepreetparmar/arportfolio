import { useMemo } from 'react'
import * as THREE from 'three'
import type { WorldLocation } from '../../../data/worldLocations'
import { LightPool } from '../daynight/BuildingLighting'
import { lampGlassMaterial } from '../daynight/nightLighting'
import { InstancedParts, type InstanceItem } from '../environment/InstancedParts'
import { applyWind } from '../environment/wind'
import { FLOWER_COLORS, WORLD_PALETTE, worldMat } from '../worldMaterials'

/** Ground lights round the back of the clearing and either side of the way in, never in the view ahead. */
const GROUND_LIGHTS = [-2, -1.4, -0.7, 0.7, 1.4, 2].map((a) => [Math.sin(a) * 2.25, -Math.cos(a) * 2.25] as [number, number])

const clearingGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2)
const sphereGeo = new THREE.SphereGeometry(1, 8, 6)
const flowerMat = applyWind(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), 'head', 0.012)
const leafMat = applyWind(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), 'bush', 0.02)

function jitter(i: number, k: number) {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/**
 * The quiet spot at the southern edge: a gravel clearing with one bench looking back over the
 * town to where the Milky Way rises. A warm lantern by the bench, a few low lights in the grass
 * behind and a cool wash of moonlight; the sky ahead is left open.
 */
export function SkyViewpoint({ location }: { location: WorldLocation }) {
  const r = location.radius ?? 2.4
  const [lanternX, lanternZ] = location.obstacles?.[0] ?? [0.95, -0.12]
  const glass = lampGlassMaterial('#ffc27a', 1.8, 0.05)
  const puck = lampGlassMaterial('#ffd59a', 1.3, 0.02)
  const metal = worldMat(WORLD_PALETTE.lampMetal, 0.5, 0.3)

  const { heads, leaves } = useMemo(() => {
    const heads: InstanceItem[] = []
    const leaves: InstanceItem[] = []
    for (let i = 0; i < 26; i++) {
      // Behind and beside the bench only: the half circle away from the view.
      const a = Math.PI * (0.15 + 0.7 * (i / 26)) + jitter(i, 1) * 0.12
      const d = r + 0.1 + jitter(i, 2) * 0.55
      const x = Math.cos(a) * d * (i % 2 ? 1 : -1)
      const z = -Math.sin(a) * d
      leaves.push({ position: [x, 0.07, z], scale: [0.16, 0.1, 0.16], color: WORLD_PALETTE.leafDeep })
      if (i % 2 === 0)
        heads.push({
          position: [x + 0.04, 0.2 + jitter(i, 3) * 0.08, z],
          scale: 0.035,
          color: i % 3 ? FLOWER_COLORS[0] : FLOWER_COLORS[3],
        })
    }
    return { heads, leaves }
  }, [r])

  const { x, z } = location.position
  return (
    <group position={[x, 0, z]} rotation={[0, location.rotation, 0]}>
      <mesh geometry={clearingGeo} scale={[r + 0.25, 1, r + 0.25]} position={[0, 0.014, 0]} material={worldMat(WORLD_PALETTE.pathEdge, 1)} receiveShadow />
      <mesh geometry={clearingGeo} scale={[r, 1, r]} position={[0, 0.018, 0]} material={worldMat('#e2d2b0', 1)} receiveShadow />

      <group position={[lanternX, 0, lanternZ]}>
        <mesh position={[0, 0.4, 0]} material={metal} castShadow>
          <cylinderGeometry args={[0.025, 0.035, 0.8, 8]} />
        </mesh>
        <mesh position={[0, 0.9, 0]} material={glass}>
          <boxGeometry args={[0.13, 0.17, 0.13]} />
        </mesh>
        <mesh position={[0, 1.01, 0]} material={metal}>
          <coneGeometry args={[0.11, 0.07, 4]} />
        </mesh>
        <mesh position={[0, 0.8, 0]} material={metal}>
          <boxGeometry args={[0.15, 0.025, 0.15]} />
        </mesh>
      </group>
      <LightPool position={[0.35, 0.024, 0.1]} size={[2.8, 2.4]} strength={0.42} />
      <LightPool position={[0, 0.022, 0.6]} size={[7, 7]} color="#b9c9ee" strength={0.14} />

      {GROUND_LIGHTS.map(([lx, lz], i) => (
        <group key={i} position={[lx, 0, lz]}>
          <mesh position={[0, 0.03, 0]} material={metal}>
            <cylinderGeometry args={[0.06, 0.07, 0.06, 10]} />
          </mesh>
          <mesh position={[0, 0.065, 0]} material={puck}>
            <cylinderGeometry args={[0.045, 0.045, 0.012, 10]} />
          </mesh>
          <LightPool position={[0, 0.026, 0]} size={[0.9, 0.9]} strength={0.22} />
        </group>
      ))}

      <InstancedParts geometry={sphereGeo} material={leafMat} items={leaves} receiveShadow />
      <InstancedParts geometry={sphereGeo} material={flowerMat} items={heads} />
    </group>
  )
}
