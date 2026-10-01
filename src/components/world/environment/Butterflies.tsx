import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { BUTTERFLY_ZONES, type ButterflyZone } from '../../../data/butterflyZones'
import { useIsTouchDevice, useReducedMotion } from '../../../hooks/useMediaQuery'
import { butterflySignals } from '../../character/butterflySignals'
import { characterSignals } from '../../character/characterSignals'
import { isInRoomSpace } from '../../project-room/roomSpace'
import { mapView } from '../mapNavigation'
import { butterflyActivity } from './butterflyActivity'

const POOL_DESKTOP = 7
const POOL_TOUCH = 4
const ZONE_REACH = 34

const VARIANTS = [
  { upper: '#f1c64a', lower: '#f0b84a' },
  { upper: '#f7e8c8', lower: '#ee9446' },
  { upper: '#b8d4ee', lower: '#ae96d8' },
  { upper: '#f0c4b8', lower: '#e992ab' },
] as const

type Phase = 'cruise' | 'hover' | 'land'

type ButterflyState = {
  zoneId: string
  x: number
  y: number
  z: number
  targetX: number
  targetZ: number
  targetY: number
  phase: Phase
  phaseT: number
  wingPhase: number
  yaw: number
  fade: number
  seed: number
}

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function distXZ(ax: number, az: number, bx: number, bz: number) {
  return Math.hypot(ax - bx, az - bz)
}

function pickZone(slot: number, cx: number, cz: number): ButterflyZone {
  const near = BUTTERFLY_ZONES.filter((z) => distXZ(cx, cz, z.center.x, z.center.z) < z.radius + ZONE_REACH)
  const pool = near.length ? near : BUTTERFLY_ZONES
  let sum = 0
  const weights = pool.map((z) => {
    const d = Math.max(1, distXZ(cx, cz, z.center.x, z.center.z))
    const w = z.weight / d
    sum += w
    return w
  })
  let r = hash(slot * 0.17 + cx * 0.03 + cz * 0.05) * sum
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

function randomPoint(zone: ButterflyZone, seed: number, avoidX: number, avoidZ: number) {
  const inner = zone.id === 'central-garden' ? 0.95 : 0.35
  for (let t = 0; t < 8; t++) {
    const a = hash(seed + t * 1.7) * Math.PI * 2
    const r = inner + hash(seed + t * 2.3) * (zone.radius - inner)
    const x = zone.center.x + Math.cos(a) * r
    const z = zone.center.z + Math.sin(a) * r
    if (distXZ(x, z, avoidX, avoidZ) > 2.2) {
      const y = zone.yMin + hash(seed + t) * (zone.yMax - zone.yMin)
      return { x, z, y }
    }
  }
  const a = hash(seed) * Math.PI * 2
  const r = inner + hash(seed + 1) * (zone.radius - inner) * 0.85
  return {
    x: zone.center.x + Math.cos(a) * r,
    z: zone.center.z + Math.sin(a) * r,
    y: zone.yMin + hash(seed + 2) * (zone.yMax - zone.yMin),
  }
}

function pickTarget(b: ButterflyState, zone: ButterflyZone, avoidX: number, avoidZ: number) {
  const p = randomPoint(zone, b.seed + b.phaseT * 17, avoidX, avoidZ)
  b.targetX = p.x
  b.targetZ = p.z
  b.targetY = p.y
  b.phaseT = 2.8 + hash(b.seed + p.x) * 5.5
}

function initButterfly(slot: number): ButterflyState {
  const zone = pickZone(slot, 0, 2)
  const p = randomPoint(zone, slot * 9.1, 0, 0)
  return {
    zoneId: zone.id,
    x: p.x,
    y: p.y,
    z: p.z,
    targetX: p.x,
    targetZ: p.z,
    targetY: p.y,
    phase: 'cruise',
    phaseT: 1 + hash(slot),
    wingPhase: hash(slot + 3) * 10,
    yaw: hash(slot + 4) * Math.PI * 2,
    fade: 0,
    seed: slot * 1.618 + 0.42,
  }
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt))
}

function stepButterfly(b: ButterflyState, zone: ButterflyZone, dt: number, speedScale: number, allowLand: boolean) {
  b.wingPhase += dt * (b.phase === 'hover' ? 16 : b.phase === 'land' ? 5 : 11)
  if (b.phase === 'land') {
    b.y = damp(b.y, b.targetY, 5, dt)
    b.phaseT -= dt
    if (b.phaseT <= 0) {
      b.phase = 'cruise'
      pickTarget(b, zone, characterSignals.x, characterSignals.z)
    }
    return
  }
  if (b.phase === 'hover') {
    b.phaseT -= dt
    b.y += Math.sin(b.wingPhase * 0.7) * 0.0008
    if (b.phaseT <= 0) {
      b.phase = 'cruise'
      pickTarget(b, zone, characterSignals.x, characterSignals.z)
    }
    return
  }

  b.phaseT -= dt
  const dx = b.targetX - b.x
  const dz = b.targetZ - b.z
  const d = Math.hypot(dx, dz) || 1
  if (d < 0.14 || b.phaseT <= 0) {
    const r = hash(b.seed + b.wingPhase)
    if (allowLand && r < 0.06) {
      b.phase = 'land'
      b.phaseT = 2.2 + hash(b.seed) * 3.5
      const p = randomPoint(zone, b.seed + 99, characterSignals.x, characterSignals.z)
      b.targetX = p.x
      b.targetZ = p.z
      b.targetY = zone.yMin + 0.08 + hash(b.seed) * 0.35
      return
    }
    if (r < 0.28) {
      b.phase = 'hover'
      b.phaseT = 1.2 + hash(b.seed + 1) * 2.2
      return
    }
    pickTarget(b, zone, characterSignals.x, characterSignals.z)
  }

  const speed = (0.28 + hash(b.seed + 2) * 0.38) * speedScale
  const step = Math.min(d, speed * dt)
  b.x += (dx / d) * step
  b.z += (dz / d) * step
  const bob = Math.sin(b.wingPhase * 0.55 + b.seed) * 0.06
  const yGoal = THREE.MathUtils.lerp(b.y, b.targetY + bob, 1 - Math.exp(-2.2 * dt))
  b.y = THREE.MathUtils.clamp(yGoal, zone.yMin, zone.yMax)
  b.yaw = Math.atan2(dx, dz) + Math.sin(b.wingPhase * 0.35) * 0.08
}

function ButterflyVisual({
  upper,
  lower,
  wingL,
  wingR,
}: {
  upper: string
  lower: string
  wingL: RefObject<THREE.Group | null>
  wingR: RefObject<THREE.Group | null>
}) {
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2c2926', roughness: 0.75 }), [])
  const wingU = useMemo(() => new THREE.MeshStandardMaterial({ color: upper, roughness: 0.62, side: THREE.DoubleSide }), [upper])
  const wingLMat = useMemo(() => new THREE.MeshStandardMaterial({ color: lower, roughness: 0.65, side: THREE.DoubleSide }), [lower])
  return (
    <group>
      <mesh material={body} castShadow>
        <capsuleGeometry args={[0.028, 0.07, 4, 6]} />
      </mesh>
      <group ref={wingL} position={[-0.02, 0.02, 0]}>
        <mesh position={[-0.055, 0.028, 0]} rotation={[0, 0, 0.35]} material={wingU}>
          <planeGeometry args={[0.11, 0.075]} />
        </mesh>
        <mesh position={[-0.05, -0.02, 0.008]} rotation={[0, 0, 0.15]} material={wingLMat}>
          <planeGeometry args={[0.09, 0.055]} />
        </mesh>
      </group>
      <group ref={wingR} position={[0.02, 0.02, 0]} scale={[-1, 1, 1]}>
        <mesh position={[-0.055, 0.028, 0]} rotation={[0, 0, 0.35]} material={wingU}>
          <planeGeometry args={[0.11, 0.075]} />
        </mesh>
        <mesh position={[-0.05, -0.02, 0.008]} rotation={[0, 0, 0.15]} material={wingLMat}>
          <planeGeometry args={[0.09, 0.055]} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * A small pool of stylized butterflies that drift between garden zones by day and fade out at dusk.
 * All motion runs in useFrame; nothing touches React state per frame.
 */
export function Butterflies() {
  const touch = useIsTouchDevice()
  const reduced = useReducedMotion()
  const pool = touch ? POOL_TOUCH : POOL_DESKTOP
  const states = useRef<ButterflyState[]>(
    Array.from({ length: POOL_DESKTOP }, (_, i) => initButterfly(i)),
  )
  const roots = useMemo(
    () => Array.from({ length: POOL_DESKTOP }, () => ({ current: null as THREE.Group | null })),
    [],
  )
  const wingL = useMemo(
    () => Array.from({ length: POOL_DESKTOP }, () => ({ current: null as THREE.Group | null })),
    [],
  )
  const wingR = useMemo(
    () => Array.from({ length: POOL_DESKTOP }, () => ({ current: null as THREE.Group | null })),
    [],
  )

  useFrame((state, dt) => {
    const activity = butterflyActivity()
    const timeBucket = Math.floor(state.clock.elapsedTime * 0.07)
    const indoors = !characterSignals.present || isInRoomSpace(characterSignals.x, characterSignals.z)
    const cx = characterSignals.x
    const cz = characterSignals.z
    const speedScale = reduced ? 0.45 : touch ? 0.85 : 1
    const cap = reduced ? Math.max(2, Math.floor(pool * 0.45)) : pool
    let glanceX = 0
    let glanceY = 1
    let glanceZ = 0
    let glanceDist = Infinity

    const zoneCounts = new Map<string, number>()

    for (let i = 0; i < pool; i++) {
      const b = states.current[i]
      const root = roots[i].current
      const wl = wingL[i].current
      const wr = wingR[i].current
      if (!root || !wl || !wr) continue

      const slotChance = 0.58 + hash(i * 2.1) * 0.32
      const wantOn = !indoors && activity > 0.04 && i < cap && hash(i * 5.3 + timeBucket) < activity * slotChance
      b.fade = damp(b.fade, wantOn ? activity : 0, wantOn ? 1.4 : 2.8, dt)
      if (b.fade < 0.02) {
        root.visible = false
        continue
      }

      const zone = pickZone(i, cx, cz)
      if (b.zoneId !== zone.id) {
        b.zoneId = zone.id
        const p = randomPoint(zone, b.seed + i, cx, cz)
        b.x = p.x
        b.z = p.z
        b.y = p.y
        pickTarget(b, zone, cx, cz)
      }

      const inZone = zoneCounts.get(zone.id) ?? 0
      if (inZone >= zone.maxButterflies) {
        b.fade = damp(b.fade, 0, 3, dt)
        root.visible = b.fade >= 0.02
        continue
      }
      zoneCounts.set(zone.id, inZone + 1)

      stepButterfly(b, zone, dt, speedScale, !reduced)
      root.visible = true
      root.position.set(b.x, b.y, b.z)
      root.rotation.set(0, b.yaw, Math.sin(b.wingPhase * 0.9) * 0.12)
      const flap = b.phase === 'land' ? 0.08 : 0.42 + (b.phase === 'hover' ? 0.12 : 0)
      const wingA = Math.sin(b.wingPhase) * flap
      wl.rotation.x = wingA
      wr.rotation.x = -wingA
      root.scale.setScalar(0.17 * (0.92 + hash(b.seed) * 0.18) * b.fade)

      const dChar = distXZ(b.x, b.z, cx, cz)
      if (dChar < glanceDist && dChar < 2.8) {
        glanceDist = dChar
        glanceX = b.x
        glanceY = b.y + 0.05
        glanceZ = b.z
      }
    }

    const still =
      !characterSignals.walking && distXZ(cx, cz, mapView.focusX, mapView.focusZ) < 0.35
    butterflySignals.active = activity > 0.25 && glanceDist < 2.8 && still
    butterflySignals.x = glanceX
    butterflySignals.y = glanceY
    butterflySignals.z = glanceZ
  })

  useEffect(() => {
    return () => {
      butterflySignals.active = false
    }
  }, [])

  return (
    <>
      {Array.from({ length: pool }, (_, i) => {
        const v = VARIANTS[i % VARIANTS.length]
        return (
          <group key={i} ref={roots[i]} visible={false}>
            <ButterflyVisual upper={v.upper} lower={v.lower} wingL={wingL[i]} wingR={wingR[i]} />
          </group>
        )
      })}
    </>
  )
}
