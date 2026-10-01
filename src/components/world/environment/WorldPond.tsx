import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../../../hooks/useMediaQuery'
import { WORLD_POND } from '../../../data/worldScenery'
import { WORLD_PALETTE, worldMat } from '../worldMaterials'
import { InstancedParts, type InstanceItem } from './InstancedParts'
import { applyWind, windUniforms } from './wind'

const { x: PX, z: PZ, radius: R } = WORLD_POND

/** Organic outline: a circle nudged by two slow harmonics so it never reads as a disc. */
function pondShape(scale: number) {
  const shape = new THREE.Shape()
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const r = R * scale * (1 + 0.09 * Math.sin(3 * a + 0.6) + 0.05 * Math.sin(5 * a + 2.1))
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  return shape
}

/** Rippled water, shared by the pond and the landmark's pool. */
export const waterMat = new THREE.MeshStandardMaterial({ color: '#7fa6a8', roughness: 0.16, metalness: 0.05 })
waterMat.onBeforeCompile = (shader) => {
  shader.uniforms.uWindTime = windUniforms.uWindTime
  shader.uniforms.uWindStrength = windUniforms.uWindStrength
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vPondXZ;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPondXZ = (modelMatrix * vec4(transformed, 1.0)).xz;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vPondXZ;\nuniform float uWindTime;\nuniform float uWindStrength;')
    .replace(
      '#include <normal_fragment_begin>',
      /* glsl */ `#include <normal_fragment_begin>
{
  vec2 p = vPondXZ;
  float t = uWindTime;
  vec3 ripple = vec3(
    sin(p.x * 5.0 + t * 1.3) + sin((p.x + p.y) * 7.0 - t * 1.7),
    0.0,
    cos(p.y * 6.0 - t * 1.1) + sin((p.x - p.y) * 8.0 + t * 1.5)
  ) * 0.03 * uWindStrength;
  normal = normalize(normal + (viewMatrix * vec4(ripple, 0.0)).xyz);
}`,
    )
}
waterMat.customProgramCacheKey = () => 'pond-water'

const reedGeo = new THREE.ConeGeometry(0.014, 0.3, 4)
const reedMat = applyWind(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), 'blade', 0.06)
const stoneGeo = new THREE.DodecahedronGeometry(0.18, 0)
const stoneMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true })
const padGeo = new THREE.CircleGeometry(0.13, 14, 0.35, Math.PI * 2 - 0.7)
padGeo.rotateX(-Math.PI / 2)

/** Deterministic jitter so the pond looks the same on every visit. */
function jitter(i: number, k: number) {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

function Duck({ phase, radius, speed }: { phase: number; radius: number; speed: number }) {
  const ref = useRef<THREE.Group>(null)
  const reduced = useReducedMotion()
  const body = worldMat('#f4efe4', 0.8)
  const head = worldMat('#3d5c45', 0.7)
  const beak = worldMat('#e0a23c', 0.7)
  useFrame((state) => {
    const g = ref.current
    if (!g) return
    const t = reduced ? 0 : state.clock.elapsedTime
    const a = phase + t * speed
    const r = radius * (1 + 0.12 * Math.sin(t * 0.13 + phase))
    g.position.set(PX + Math.cos(a) * r, 0.03 + Math.sin(t * 1.6 + phase) * 0.004, PZ + Math.sin(a) * r)
    g.rotation.y = -a + (speed > 0 ? 0 : Math.PI)
  })
  return (
    <group ref={ref}>
      <mesh position={[0, 0.045, 0]} scale={[0.09, 0.06, 0.14]} material={body} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      <mesh position={[0, 0.06, -0.12]} rotation={[0.5, 0, 0]} scale={[0.04, 0.03, 0.05]} material={body}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
      <mesh position={[0, 0.13, 0.1]} scale={0.045} material={head} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      <mesh position={[0, 0.12, 0.155]} rotation={[Math.PI / 2, 0, 0]} material={beak}>
        <coneGeometry args={[0.016, 0.05, 6]} />
      </mesh>
    </group>
  )
}

/** A small pond in the meadow: reeds on its far bank, a few lily pads and two ducks idling round. */
export function WorldPond() {
  const water = useMemo(() => {
    const g = new THREE.ShapeGeometry(pondShape(1))
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const bank = useMemo(() => {
    const g = new THREE.ShapeGeometry(pondShape(1.14))
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  const stones = useMemo<InstanceItem[]>(
    () =>
      Array.from({ length: 11 }, (_, i) => {
        const a = (i / 11) * Math.PI * 2 + jitter(i, 1) * 0.3
        const r = R * (1.1 + 0.09 * Math.sin(3 * a + 0.6))
        const s = 0.55 + jitter(i, 2) * 0.6
        return {
          position: [PX + Math.cos(a) * r, 0.03 * s, PZ - Math.sin(a) * r] as [number, number, number],
          rotation: [0, jitter(i, 3) * Math.PI, 0] as [number, number, number],
          scale: [s * 1.2, s * 0.5, s] as [number, number, number],
          color: i % 3 ? WORLD_PALETTE.stone : WORLD_PALETTE.stoneDark,
        }
      }),
    [],
  )

  const reeds = useMemo<InstanceItem[]>(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = 2.1 + (jitter(i, 4) - 0.5) * 1.3
        const r = R * (0.88 + jitter(i, 5) * 0.22)
        const h = 1.6 + jitter(i, 6) * 1.4
        return {
          position: [PX + Math.cos(a) * r, 0.15 * h, PZ - Math.sin(a) * r] as [number, number, number],
          rotation: [(jitter(i, 7) - 0.5) * 0.2, 0, (jitter(i, 8) - 0.5) * 0.25] as [number, number, number],
          scale: [1, h, 1] as [number, number, number],
          color: i % 4 ? '#7d9a5a' : '#a9a46a',
        }
      }),
    [],
  )

  const pads = useMemo<InstanceItem[]>(
    () =>
      [
        [0.35, -0.42, 1],
        [0.62, -0.18, 0.8],
        [-0.48, 0.3, 0.9],
        [-0.2, 0.62, 0.7],
        [0.1, -0.7, 0.75],
      ].map(([ox, oz, s], i) => ({
        position: [PX + ox, 0.032, PZ + oz] as [number, number, number],
        rotation: [0, jitter(i, 9) * Math.PI * 2, 0] as [number, number, number],
        scale: s,
        color: i % 2 ? '#5f8a4a' : '#6f9a52',
      })),
    [],
  )

  return (
    <group>
      <mesh geometry={bank} position={[PX, 0.016, PZ]} material={worldMat('#7e8a5a', 1)} receiveShadow />
      <mesh geometry={water} position={[PX, 0.026, PZ]} material={waterMat} receiveShadow />
      <InstancedParts geometry={stoneGeo} material={stoneMat} items={stones} castShadow receiveShadow />
      <InstancedParts geometry={reedGeo} material={reedMat} items={reeds} castShadow />
      <InstancedParts geometry={padGeo} material={worldMat('#ffffff', 0.8)} items={pads} receiveShadow />
      <mesh position={[PX + 0.35, 0.05, PZ - 0.42]} material={worldMat('#f3d9e2', 0.7)}>
        <sphereGeometry args={[0.035, 8, 6]} />
      </mesh>
      <Duck phase={0.4} radius={R * 0.55} speed={0.05} />
      <Duck phase={2.6} radius={R * 0.6} speed={0.038} />
    </group>
  )
}
