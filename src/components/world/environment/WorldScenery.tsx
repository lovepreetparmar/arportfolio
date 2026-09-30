import { useMemo } from 'react'
import * as THREE from 'three'
import { getProjectBySlug } from '../../../data/projects'
import { getProjectEntrance } from '../../../data/projectWorld'
import { getWorldScenery, type TreeSpot } from '../../../data/worldScenery'
import { StreetLamp, StreetLampLights } from '../daynight/StreetLamps'
import { createSignTexture, WORLD_PALETTE, worldMat } from '../worldMaterials'
import { InstancedParts, type InstanceItem } from './InstancedParts'

const sphereGeo = new THREE.SphereGeometry(1, 18, 14)
const trunkGeo = new THREE.CylinderGeometry(0.06, 0.09, 1, 8)
const stoneGeo = new THREE.DodecahedronGeometry(0.18, 0)
const tuftGeo = new THREE.ConeGeometry(0.022, 0.3, 4)
const flowerGeo = new THREE.SphereGeometry(0.045, 8, 6)
const whiteMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 })
const stoneMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true })

const LEAF = [WORLD_PALETTE.leaf, WORLD_PALETTE.leafDeep, WORLD_PALETTE.leafLight]
const CYPRESS = [WORLD_PALETTE.cypress, '#7a8765', '#66735a']

function treeParts(trees: TreeSpot[]) {
  const trunks: InstanceItem[] = []
  const canopy: InstanceItem[] = []
  for (const t of trees) {
    const s = t.scale
    const c = Math.cos(t.rot)
    const n = Math.sin(t.rot)
    const at = (ox: number, y: number, oz: number): [number, number, number] => [
      t.x + ox * c + oz * n,
      y,
      t.z - ox * n + oz * c,
    ]
    if (t.kind === 'round') {
      trunks.push({ position: [t.x, 0.65 * s, t.z], scale: [s, 1.3 * s, s], color: WORLD_PALETTE.trunk })
      canopy.push({ position: at(0, 1.95 * s, 0), scale: [0.95 * s, 0.86 * s, 0.95 * s], color: LEAF[t.tint] })
      canopy.push({ position: at(0.5 * s, 1.6 * s, 0.2 * s), scale: 0.58 * s, color: LEAF[(t.tint + 1) % 3] })
      canopy.push({ position: at(-0.42 * s, 1.72 * s, -0.28 * s), scale: 0.52 * s, color: LEAF[t.tint] })
    } else if (t.kind === 'cypress') {
      trunks.push({ position: [t.x, 0.25 * s, t.z], scale: [0.9 * s, 0.5 * s, 0.9 * s], color: WORLD_PALETTE.trunk })
      canopy.push({ position: [t.x, 1.55 * s, t.z], scale: [0.5 * s, 1.35 * s, 0.5 * s], color: CYPRESS[t.tint] })
    } else {
      canopy.push({ position: at(0, 0.3 * s, 0), scale: [0.5 * s, 0.4 * s, 0.5 * s], color: LEAF[t.tint] })
      canopy.push({ position: at(0.38 * s, 0.22 * s, 0.1 * s), scale: 0.3 * s, color: LEAF[(t.tint + 2) % 3] })
    }
  }
  return { trunks, canopy }
}

const SIGNPOST_SLUGS = ['food-creatives', 'roshan-shah', 'brand-identity']
const SIGNPOST_POS = { x: 1.72, z: -0.8 }

function Signpost() {
  const boards = useMemo(
    () =>
      SIGNPOST_SLUGS.map((slug, i) => {
        const project = getProjectBySlug(slug)!
        const e = getProjectEntrance(project)
        const dx = e.buildingX - SIGNPOST_POS.x
        const dz = e.buildingZ - SIGNPOST_POS.z
        const name = project.title.split('|')[0].trim()
        return {
          slug,
          yaw: Math.atan2(-dz, dx),
          y: 1.62 - i * 0.28,
          texture: createSignTexture(name, 5, { background: WORLD_PALETTE.ivory, color: WORLD_PALETTE.ink }),
        }
      }),
    [],
  )
  const wood = worldMat(WORLD_PALETTE.woodDark, 0.8)
  const face = worldMat(WORLD_PALETTE.ivory, 0.9)
  return (
    <group position={[SIGNPOST_POS.x, 0, SIGNPOST_POS.z]}>
      <mesh position={[0, 0.95, 0]} material={wood} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 1.9, 8]} />
      </mesh>
      {boards.map((b) => (
        <group key={b.slug} position={[0, b.y, 0]} rotation={[0, b.yaw, 0]}>
          <mesh position={[0.52, 0, 0]} material={face} castShadow>
            <boxGeometry args={[0.9, 0.2, 0.035]} />
          </mesh>
          <mesh position={[0.97, 0, 0]} rotation={[0, 0, Math.PI / 4]} material={face} castShadow>
            <boxGeometry args={[0.1414, 0.1414, 0.035]} />
          </mesh>
          <mesh position={[0.52, 0, 0.019]}>
            <planeGeometry args={[0.86, 0.172]} />
            <meshStandardMaterial map={b.texture} roughness={0.9} />
          </mesh>
          <mesh position={[0.52, 0, -0.019]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.86, 0.172]} />
            <meshStandardMaterial map={b.texture} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function WorldScenery() {
  const { trees, stones, tufts, flowers, lamps } = getWorldScenery()

  const { trunks, canopy } = useMemo(() => treeParts(trees), [trees])
  const stoneItems = useMemo<InstanceItem[]>(
    () =>
      stones.map((s, i) => ({
        position: [s.x, 0.04 * s.scale, s.z],
        rotation: [0, s.rot, 0],
        scale: [s.scale * 1.2, s.scale * 0.55, s.scale],
        color: i % 3 ? WORLD_PALETTE.stone : WORLD_PALETTE.stoneDark,
      })),
    [stones],
  )
  const tuftItems = useMemo<InstanceItem[]>(
    () =>
      tufts.flatMap((t) =>
        [-0.45, -0.15, 0.15, 0.45].map((lean, k) => ({
          position: [t.x + lean * 0.1, 0.13 * t.scale, t.z + ((k % 2) - 0.5) * 0.06] as [number, number, number],
          rotation: [0, 0, lean] as [number, number, number],
          scale: t.scale,
          color: t.tint ? WORLD_PALETTE.tuft : WORLD_PALETTE.leafDeep,
        })),
      ),
    [tufts],
  )
  const flowerItems = useMemo<InstanceItem[]>(
    () =>
      flowers.map((f) => ({
        position: [f.x, 0.1 * f.scale, f.z],
        scale: f.scale,
        color: f.tint ? WORLD_PALETTE.flowerTerracotta : WORLD_PALETTE.flowerCream,
      })),
    [flowers],
  )

  return (
    <group>
      <InstancedParts geometry={trunkGeo} material={whiteMat} items={trunks} castShadow />
      <InstancedParts geometry={sphereGeo} material={whiteMat} items={canopy} castShadow receiveShadow />
      <InstancedParts geometry={stoneGeo} material={stoneMat} items={stoneItems} castShadow receiveShadow />
      <InstancedParts geometry={tuftGeo} material={whiteMat} items={tuftItems} />
      <InstancedParts geometry={flowerGeo} material={whiteMat} items={flowerItems} />
      {lamps.map((l, i) => (
        <StreetLamp key={i} x={l.x} z={l.z} />
      ))}
      <StreetLampLights lamps={lamps} />
      <Signpost />
    </group>
  )
}
