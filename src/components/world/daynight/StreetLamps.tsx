import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useIsTouchDevice } from '../../../hooks/useMediaQuery'
import { mapView } from '../mapNavigation'
import { WORLD_PALETTE, worldMat } from '../worldMaterials'
import { LightPool } from './BuildingLighting'
import { dayNight } from './DayNightController'
import { lampGlassMaterial } from './nightLighting'

const LAMP_HEIGHT = 2.34
/** Real lights are few and shared: they hop to the lamps nearest the view. */
const REAL_LIGHTS_DESKTOP = 3
const REAL_LIGHTS_MOBILE = 1
const REAL_LIGHT_INTENSITY = 5.5
const REAL_LIGHT_DISTANCE = 6
const RESELECT_SECONDS = 0.4

/** Path lamp: pale glass by day; warm bulb and a soft pool of light on the path at night. */
export function StreetLamp({ x, z }: { x: number; z: number }) {
  const dark = worldMat(WORLD_PALETTE.charcoal, 0.55, 0.25)
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.06, 0]} material={dark} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.12, 12]} />
      </mesh>
      <mesh position={[0, 1.15, 0]} material={dark} castShadow>
        <cylinderGeometry args={[0.028, 0.036, 2.2, 8]} />
      </mesh>
      <mesh position={[0, LAMP_HEIGHT, 0]} material={lampGlassMaterial('#ffc27a', 1.5, 0.15)}>
        <sphereGeometry args={[0.13, 16, 12]} />
      </mesh>
      <mesh position={[0, 2.49, 0]} material={dark}>
        <cylinderGeometry args={[0.02, 0.09, 0.06, 12]} />
      </mesh>
      <LightPool position={[0, 0.032, 0]} size={[3.4, 3.4]} strength={0.46} />
    </group>
  )
}

/** A handful of real point lights placed at the lamps closest to the camera focus. */
export function StreetLampLights({ lamps }: { lamps: { x: number; z: number }[] }) {
  const touch = useIsTouchDevice()
  const count = touch ? REAL_LIGHTS_MOBILE : REAL_LIGHTS_DESKTOP
  const lights = useRef<(THREE.PointLight | null)[]>([])
  const reselect = useRef(0)
  /** Per light: lamp index it shows, lamp it should move to, and its fade (0–1). */
  const slots = useRef<{ current: number; next: number; fade: number }[]>([])

  useFrame((_, delta) => {
    const level = dayNight.state.lamps
    if (slots.current.length !== count) {
      slots.current = Array.from({ length: count }, () => ({ current: -1, next: -1, fade: 0 }))
    }
    reselect.current -= delta
    if (reselect.current <= 0 && level > 0) {
      reselect.current = RESELECT_SECONDS
      const wanted = lamps
        .map((l, i) => ({ i, d: (l.x - mapView.focusX) ** 2 + (l.z - mapView.focusZ) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, count)
        .map((w) => w.i)
      const kept = new Set(slots.current.map((s) => s.current).filter((c) => wanted.includes(c)))
      const free = wanted.filter((w) => !kept.has(w))
      for (const slot of slots.current) {
        slot.next = kept.has(slot.current) ? slot.current : (free.shift() ?? slot.current)
      }
    }
    slots.current.forEach((slot, i) => {
      const light = lights.current[i]
      if (!light) return
      if (slot.next !== slot.current) {
        slot.fade = Math.max(0, slot.fade - delta * 4)
        if (slot.fade === 0) slot.current = slot.next
      } else if (slot.current >= 0) {
        slot.fade = Math.min(1, slot.fade + delta * 2)
      }
      const lamp = lamps[slot.current]
      if (lamp) light.position.set(lamp.x, LAMP_HEIGHT - 0.1, lamp.z)
      light.intensity = level * slot.fade * REAL_LIGHT_INTENSITY
    })
  })

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lights.current[i] = el
          }}
          color="#ffc88a"
          intensity={0}
          distance={REAL_LIGHT_DISTANCE}
          decay={2}
        />
      ))}
    </>
  )
}
