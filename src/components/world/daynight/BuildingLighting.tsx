import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useIsTouchDevice } from '../../../hooks/useMediaQuery'
import { WORLD_PALETTE, worldMat } from '../worldMaterials'
import { dayNight } from './DayNightController'
import { lampGlassMaterial, lightPoolMaterial, registerNightMaterial, type NightChannel } from './nightLighting'

/**
 * Night lighting kit shared by every project building: entrance lights, light pools on the
 * ground, window spill, interior glow and lit signage. All of it follows the day/night clock.
 */
type Vec3 = [number, number, number]

const poolGeo = new THREE.PlaneGeometry(1, 1)
poolGeo.rotateX(-Math.PI / 2)

type LightPoolProps = {
  position: Vec3
  /** Width and depth of the pool in world units. */
  size: [number, number]
  color?: string
  strength?: number
  channel?: NightChannel
}

/** Soft warm light on the ground; drawn as a decal so it costs no real light. */
export function LightPool({ position, size, color, strength = 0.5, channel = 'lamps' }: LightPoolProps) {
  return (
    <mesh
      geometry={poolGeo}
      material={lightPoolMaterial(color, strength, channel)}
      position={position}
      scale={[size[0], 1, size[1]]}
      renderOrder={2}
    />
  )
}

export type EntranceLightStyle = 'lantern' | 'pendant' | 'bar' | 'none'

type EntranceLightProps = {
  doorWidth: number
  doorHeight: number
  /** Facade front, as passed to the door. */
  z: number
  style?: EntranceLightStyle
  metal?: string
  poolColor?: string
  poolStrength?: number
}

/** Light above a door plus the warm pool it throws onto the entrance step. */
export function EntranceLight({
  doorWidth,
  doorHeight,
  z,
  style = 'lantern',
  metal = WORLD_PALETTE.charcoal,
  poolColor = '#ffd19a',
  poolStrength = 0.42,
}: EntranceLightProps) {
  const metalMat = worldMat(metal, 0.5, 0.3)
  const glass = lampGlassMaterial('#ffc27a', 1.5)
  const y = doorHeight + 0.26
  return (
    <group>
      {style === 'lantern' && (
        <group position={[0, y, z + 0.14]}>
          <mesh position={[0, 0.02, -0.08]} material={metalMat}>
            <boxGeometry args={[0.04, 0.04, 0.14]} />
          </mesh>
          <mesh position={[0, -0.04, 0]} material={glass}>
            <boxGeometry args={[0.12, 0.16, 0.12]} />
          </mesh>
          <mesh position={[0, 0.07, 0]} material={metalMat}>
            <coneGeometry args={[0.1, 0.07, 4]} />
          </mesh>
        </group>
      )}
      {style === 'pendant' && (
        <group position={[0, y - 0.04, z + 0.36]}>
          <mesh position={[0, 0.1, 0]} material={metalMat}>
            <cylinderGeometry args={[0.006, 0.006, 0.2, 4]} />
          </mesh>
          <mesh position={[0, -0.02, 0]} material={metalMat}>
            <coneGeometry args={[0.09, 0.07, 14, 1, true]} />
          </mesh>
          <mesh position={[0, -0.06, 0]} material={glass}>
            <sphereGeometry args={[0.045, 12, 8]} />
          </mesh>
        </group>
      )}
      {style === 'bar' && (
        <group position={[0, y - 0.1, z + 0.06]}>
          <mesh material={metalMat}>
            <boxGeometry args={[doorWidth + 0.1, 0.05, 0.08]} />
          </mesh>
          <mesh position={[0, -0.028, 0.01]} material={glass}>
            <boxGeometry args={[doorWidth, 0.012, 0.05]} />
          </mesh>
        </group>
      )}
      <LightPool position={[0, 0.135, z + 0.75]} size={[doorWidth * 2.4, 1.9]} color={poolColor} strength={poolStrength} />
    </group>
  )
}

/** Warm window light falling onto the ground in front of a facade window. */
export function WindowSpill({ x, z, width, strength = 0.28 }: { x: number; z: number; width: number; strength?: number }) {
  return <LightPool position={[x, 0.03, z + 0.6]} size={[width * 1.5, 1.3]} color="#ffcf92" strength={strength} />
}

type InteriorLightProps = {
  position: Vec3
  color?: string
  intensity?: number
  distance?: number
}

/**
 * A real light for an interior that spills through its windows. Used sparingly (only where
 * a storefront is meant to glow); skipped on touch devices, where pools carry the effect.
 */
export function InteriorLight({ position, color = '#ffc98c', intensity = 5, distance = 5.5 }: InteriorLightProps) {
  const touch = useIsTouchDevice()
  const light = useRef<THREE.PointLight>(null)
  useFrame(() => {
    if (light.current) light.current.intensity = dayNight.state.lamps * intensity
  })
  if (touch) return null
  return <pointLight ref={light} position={position} color={color} intensity={0} distance={distance} decay={2} />
}

/** Sign face material that picks up a gentle self-illumination after dusk. */
export function useSignLightMaterial(texture: THREE.Texture, strength = 0.55) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.85,
        emissive: '#ffffff',
        emissiveMap: texture,
        emissiveIntensity: 0,
      }),
    [texture],
  )
  useEffect(() => {
    const release = registerNightMaterial(material, 'signs', strength)
    return () => {
      release()
      material.dispose()
    }
  }, [material, strength])
  return material
}
