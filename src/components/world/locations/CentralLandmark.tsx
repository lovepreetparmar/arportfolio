import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { WorldLocation } from '../../../data/worldLocations'
import { LightPool } from '../daynight/BuildingLighting'
import { lampGlassMaterial, registerNightMaterial } from '../daynight/nightLighting'
import { InstancedParts, type InstanceItem } from '../environment/InstancedParts'
import { waterMat } from '../environment/WorldPond'
import { applyWind } from '../environment/wind'
import { FLOWER_COLORS, LEAF_FAMILIES, worldMat } from '../worldMaterials'

/** Overall garden pool scale (~44% smaller footprint than the original landmark). */
const S = 0.56
/** Radii of the garden pool, from the stone step outward in. */
const STEP_R = 1.62 * S
const WALL_R = 1.5 * S
const COPING_IN = 1.42 * S
const LIP_OUT = 1.2 * S
const LIP_IN = 1.13 * S
const COPING_TOP = 0.46 * S
const SOIL_Y = 0.4 * S
const WATER_Y = 0.385 * S
const PLINTH_TOP = 0.62 * S
/** Extra downscale for the crossed hoops only (pond size stays at `S`). */
const SCULPTURE = 0.52
const SCULPTURE_PLINTH_TOP = WATER_Y + (PLINTH_TOP - WATER_Y) * SCULPTURE
/** The two bronze hoops — small garden accent, not a monument. */
const RINGS = [
  { radius: 1.08 * S * SCULPTURE, yaw: 0 },
  { radius: 0.9 * S * SCULPTURE, yaw: Math.PI / 2 },
]
const RING_TUBE = 0.05 * S * SCULPTURE

/** Flat ring with crisp edges, standing on y = 0. */
function annulus(inner: number, outer: number, height: number) {
  const shape = new THREE.Shape().absarc(0, 0, outer, 0, Math.PI * 2, false)
  shape.holes.push(new THREE.Path().absarc(0, 0, inner, 0, Math.PI * 2, true))
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 64 })
  g.rotateX(-Math.PI / 2)
  return g
}

const sphereGeo = new THREE.SphereGeometry(1, 14, 10)
const shrubMat = applyWind(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), 'canopy', 0.02)
const flowerMat = applyWind(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), 'head', 0.01)

function jitter(i: number, k: number) {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/**
 * The plaza's landmark: a round garden pool every path leads to, planted around its rim, with an
 * open bronze sculpture of two crossed hoops rising from the water. Open, so it never hides the
 * streets behind it; tall enough to find from the paths. The bronze takes the evening sun, and
 * after dark small lights under the water lift it softly out of the night.
 */
export function CentralLandmark({ location }: { location: WorldLocation }) {
  const geo = useMemo(
    () => ({
      step: new THREE.CylinderGeometry(STEP_R, STEP_R, 0.06, 64).translate(0, 0.03, 0),
      wall: new THREE.CylinderGeometry(WALL_R, WALL_R, COPING_TOP - 0.06, 64, 1, true),
      coping: annulus(COPING_IN, WALL_R + 0.03, 0.06),
      lip: annulus(LIP_IN, LIP_OUT, COPING_TOP - WATER_Y + 0.02),
      soil: new THREE.RingGeometry(LIP_OUT, COPING_IN, 64).rotateX(-Math.PI / 2),
      water: new THREE.CircleGeometry(LIP_IN, 64).rotateX(-Math.PI / 2),
      ring: RINGS.map((r) => new THREE.TorusGeometry(r.radius, RING_TUBE, 10, 72)),
    }),
    [],
  )
  useEffect(() => () => Object.values(geo).flat().forEach((g) => g.dispose()), [geo])

  const bronze = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#9a7a4e',
        roughness: 0.52,
        metalness: 0.38,
        emissive: '#c49a62',
        emissiveIntensity: 0,
      }),
    [],
  )
  useEffect(() => {
    const release = registerNightMaterial(bronze, 'lamps', 0.16)
    return () => {
      release()
      bronze.dispose()
    }
  }, [bronze])

  const stone = worldMat('#e7dbc5', 0.92)
  const coping = worldMat('#d8c6a6', 0.85)

  const { shrubs, flowers } = useMemo(() => {
    const mid = (LIP_OUT + COPING_IN) / 2
    const shrubs: InstanceItem[] = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2 + jitter(i, 1) * 0.18
      const s = (0.1 + jitter(i, 2) * 0.06) * S
      const leaf = LEAF_FAMILIES[i % 3]
      return {
        position: [Math.cos(a) * mid, SOIL_Y + s * 0.6, Math.sin(a) * mid],
        scale: [s * 1.15, s * 0.85, s * 1.15],
        color: i % 4 === 0 ? leaf[2] : i % 2 ? leaf[1] : leaf[0],
      }
    })
    const flowers: InstanceItem[] = Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2 + jitter(i, 3) * 0.3
      const r = LIP_OUT + 0.03 + jitter(i, 4) * (COPING_IN - LIP_OUT - 0.06)
      return {
        position: [Math.cos(a) * r, SOIL_Y + 0.17 + jitter(i, 5) * 0.1, Math.sin(a) * r],
        scale: (0.028 + jitter(i, 6) * 0.018) * S,
        color: i % 3 === 0 ? FLOWER_COLORS[3] : FLOWER_COLORS[0],
      }
    })
    return { shrubs, flowers }
  }, [])

  const glass = lampGlassMaterial('#ffc27a', 1.7, 0.04)
  const { x, z } = location.position

  return (
    <group position={[x, 0, z]}>
      <mesh geometry={geo.step} material={coping} receiveShadow />
      <mesh geometry={geo.wall} position={[0, 0.06 + (COPING_TOP - 0.06) / 2, 0]} material={stone} castShadow receiveShadow />
      <mesh geometry={geo.coping} position={[0, COPING_TOP - 0.06, 0]} material={coping} castShadow receiveShadow />
      <mesh geometry={geo.soil} position={[0, SOIL_Y, 0]} material={worldMat('#6b5236', 1)} receiveShadow />
      <mesh geometry={geo.lip} position={[0, WATER_Y - 0.02, 0]} material={stone} receiveShadow />
      <mesh geometry={geo.water} position={[0, WATER_Y, 0]} material={waterMat} receiveShadow />
      <InstancedParts geometry={sphereGeo} material={shrubMat} items={shrubs} castShadow receiveShadow />
      <InstancedParts geometry={sphereGeo} material={flowerMat} items={flowers} />

      <mesh position={[0, (WATER_Y + SCULPTURE_PLINTH_TOP) / 2, 0]} material={stone} castShadow receiveShadow>
        <cylinderGeometry args={[0.12 * S * SCULPTURE, 0.17 * S * SCULPTURE, SCULPTURE_PLINTH_TOP - WATER_Y, 18]} />
      </mesh>
      {RINGS.map((r, i) => (
        <mesh
          key={i}
          geometry={geo.ring[i]}
          position={[0, SCULPTURE_PLINTH_TOP + r.radius - 0.02 * SCULPTURE, 0]}
          rotation={[0, r.yaw, 0]}
          material={bronze}
          castShadow
        />
      ))}

      {[Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.42 * S, WATER_Y + 0.008, Math.sin(a) * 0.42 * S]} material={glass}>
          <cylinderGeometry args={[0.04 * S, 0.045 * S, 0.018, 12]} />
        </mesh>
      ))}
      <LightPool position={[0, WATER_Y + 0.006, 0]} size={[1.2 * S, 1.2 * S]} strength={0.22} />
      <LightPool position={[0, 0.034, 0]} size={[3.6 * S, 3.6 * S]} strength={0.11} />
    </group>
  )
}
